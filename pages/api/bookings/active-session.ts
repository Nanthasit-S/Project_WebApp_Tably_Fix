import type { NextApiRequest, NextApiResponse } from "next";

import QRCode from "qrcode";
import promptpay from "promptpay-qr";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";

type SessionRow = {
  session_id: string;
  created_at: string;
  id: number;
  table_number: string;
  capacity: number;
  timeLeft: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET"])) {
    return;
  }

  const session = await requireSession(req, res);

  if (!session?.user?.id) {
    return;
  }

  try {
    const activeSession = await withConnection(async (conn) => {
      const sessions = (await conn.query(
        `
          SELECT
            ba.session_id,
            ba.created_at,
            t.id,
            t.table_number,
            t.capacity,
            EXTRACT(EPOCH FROM ((ba.created_at + INTERVAL '15 minutes') - NOW()))::INT AS timeLeft
          FROM booking_attempts ba
          JOIN tables t ON ba.table_id = t.id
          WHERE ba.user_id = ?
            AND ba.status = 'pending'
            AND ba.created_at > NOW() - INTERVAL '15 minutes'
          ORDER BY ba.created_at DESC
          LIMIT 1
        `,
        [session.user.id],
      )) as SessionRow[];

      if (sessions.length === 0) {
        return null;
      }

      const feeRow = (await conn.query(
        "SELECT setting_value FROM settings WHERE setting_key = 'booking_fee'",
      )) as Array<{ setting_value: string }>;

      return {
        session: sessions[0],
        bookingFee: feeRow.length > 0 ? parseFloat(feeRow[0].setting_value) : 0,
      };
    });

    if (!activeSession) {
      res.status(200).json({ activeSession: false });

      return;
    }

    const { session: bookingSession, bookingFee } = activeSession;
    const promptpayAccount = process.env.PROMPTPAY_ACCOUNT;

    if (!promptpayAccount || bookingFee <= 0) {
      throw new Error("Server fee or PromptPay account not configured.");
    }

    const payload = promptpay(promptpayAccount, { amount: bookingFee });
    const qrCodeDataUrl = await QRCode.toDataURL(payload);
    const timeLeft = bookingSession.timeLeft > 0 ? bookingSession.timeLeft : 0;

    res.status(200).json({
      activeSession: true,
      sessionId: bookingSession.session_id,
      timeLeft,
      table: {
        id: bookingSession.id,
        table_number: bookingSession.table_number,
        capacity: bookingSession.capacity,
        status: "available",
      },
      amount: bookingFee,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Active Session Check Error:", error);
    res.status(500).json({ message: "Failed to check for active session." });
  }
}
