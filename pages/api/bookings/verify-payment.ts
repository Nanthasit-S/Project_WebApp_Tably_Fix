import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs"; 
import type { File as FormidableFile } from "formidable";
import { parseSlipUpload } from "@/lib/payments/slip"; 
import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withTransaction } from "@/lib/db";
import { deleteFromSupabaseStorage } from "@/lib/supabase";
import {
  ensureBookingOrdersSchema,
  expireStaleBookingOrders,
  BOOKING_ORDER_STATUSES,
  type BookingOrderStatus,
} from "@/lib/booking-orders";
import {
  lockSlipRef,
  markSlipRefAsUsed,
  normalizeSlipRef,
  uploadSlipToStorage,
  verifySlipWithOpenSlip,
} from "@/lib/payments/slip";
import { getLineIdByInternalId, sendPushMessage } from "@/lib/lineMessagingApi";

type HttpError = Error & { status: number };

type BookingOrderRow = {
  id: string;
  user_id: number;
  total_fee: number | string;
  status: string;
};
export const config = {
  api: {
    bodyParser: false,
  },
};

const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const parseFieldValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  const session = await requireSession(req, res);
  if (!session?.user?.id) {
    return;
  }

  let storedSlipAbsolutePath: string | null = null;
  let storedSlipOriginalName = "";
  let publicPath = "";

  try {
    const { fields, files, error } = await parseSlipUpload(req);
    if (error) {
      throw httpError(400, error.message);
    }

    const slipFileEntry = files.slip; 
    const slipFile = (
      Array.isArray(slipFileEntry) ? slipFileEntry[0] : slipFileEntry
    ) as FormidableFile | undefined;

    const orderId = parseFieldValue(fields.orderId);
    const refNbr = parseFieldValue(fields.refNbr);
    const amountRaw = parseFieldValue(fields.amount);

    if (
      typeof orderId !== "string" ||
      orderId.trim().length === 0 ||
      typeof refNbr !== "string" ||
      refNbr.trim().length === 0
    ) {
      throw httpError(400, "Missing required data for verification.");
    }

    if (!slipFile) {
      throw httpError(400, "Payment slip image is required.");
    }
    storedSlipAbsolutePath = slipFile.filepath; 
    storedSlipOriginalName =
      slipFile.originalFilename || slipFile.newFilename || "slip.jpg";

    const amountValue = normalizeAmount(amountRaw ?? 0);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw httpError(400, "Invalid payment amount provided.");
    }

    const normalizedRef = normalizeSlipRef(refNbr);

    try {
      await verifySlipWithOpenSlip(normalizedRef, amountValue);
    } catch (error) {
      throw httpError(
        400,
        error instanceof Error
          ? error.message
          : "Automatic slip verification failed.",
      );
    }

    publicPath = await uploadSlipToStorage(
      storedSlipAbsolutePath,
      storedSlipOriginalName,
    );

    const result = await withTransaction(async (conn) => {
      await ensureBookingOrdersSchema(conn);
      await expireStaleBookingOrders(conn);

      const slipAlreadyUsed = await lockSlipRef(conn, normalizedRef);

      if (slipAlreadyUsed) {
        throw httpError(409, "Payment slip has already been used.");
      }

      const orders = (await conn.query(
        `
          SELECT id, user_id, total_fee, status
          FROM booking_orders
          WHERE id = ?
          FOR UPDATE
        `,
        [orderId],
      )) as BookingOrderRow[];

      if (orders.length === 0) {
        throw httpError(404, "Booking order not found.");
      }

      const order = orders[0];

      if (order.user_id !== session.user.id) {
        throw httpError(403, "You are not allowed to verify this order.");
      }

      if (order.status !== BOOKING_ORDER_STATUSES.PENDING) {
        return {
          status: order.status as BookingOrderStatus,
          alreadyProcessed: true,
        };
      }

      const expectedAmount = Number(order.total_fee ?? 0);

      if (Math.abs(expectedAmount - amountValue) > 0.01) {
        throw httpError(
          400,
          "Payment amount does not match the order total.",
        );
      }

      await conn.query(
        `
          UPDATE booking_orders
          SET status = 'paid',
              ref_nbr = ?,
              paid_at = NOW(),
              expires_at = NULL,
              updated_at = NOW()
          WHERE id = ?
        `,
        [normalizedRef, orderId],
      );

      await conn.query(
        `
          UPDATE bookings
          SET status = CASE
                WHEN status = 'pending_payment' THEN 'confirmed'
                ELSE status
              END,
              slip_image_url = ?
          WHERE order_id = ?
        `,
        [publicPath, orderId],
      );

      await markSlipRefAsUsed(conn, normalizedRef);

      return {
        status: BOOKING_ORDER_STATUSES.PAID,
        alreadyProcessed: false,
      };
    });

    if (result.alreadyProcessed) {
      if (storedSlipAbsolutePath) {
        await fs.unlink(storedSlipAbsolutePath).catch(() => null);
      }
      res.status(200).json({
        message: "This booking order has already been processed.",
        status: result.status,
      });
      return;
    }

    const lineId = await getLineIdByInternalId(session.user.id);
    if (lineId) {
       await sendPushMessage(
         lineId,
         [
           "การจองโต๊ะของคุณได้รับการยืนยันแล้ว",
           "ขอบคุณที่ใช้บริการกับเรา",
         ].join("\n"),
       );
    }

    res.status(200).json({
      message: "Payment verified successfully.",
      status: BOOKING_ORDER_STATUSES.PAID,
      slip_image_url: publicPath,
    });

  } catch (error) {

    if (storedSlipAbsolutePath) {
      await fs.unlink(storedSlipAbsolutePath).catch(() => null);
    }
    if (publicPath) {
      await deleteFromSupabaseStorage(publicPath).catch(() => null);
    }
    const status = (error as Partial<HttpError>).status ?? 500;
    const message =
      status === 500
        ? (error as Error).message || "An unexpected error occurred."
        : (error as Error).message;

    if (status === 500) {
      console.error("Verify booking payment API error:", error);
    }

    res.status(status).json({ message });
  }
}
