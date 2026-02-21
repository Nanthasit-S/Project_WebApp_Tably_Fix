import type { NextApiRequest, NextApiResponse } from "next";

import QRCode from "qrcode";
import promptpay from "promptpay-qr";

import { ensureHttpMethod } from "@/lib/api-utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const { amount } = req.body as { amount?: number };

    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ message: "A valid amount is required." });

      return;
    }

    const promptpayAccount = process.env.PROMPTPAY_ACCOUNT;

    if (!promptpayAccount) {
      throw new Error("Server is not configured for PromptPay.");
    }

    const payload = promptpay(promptpayAccount, { amount });
    const qrCodeUrl = await QRCode.toDataURL(payload);

    res.status(200).json({ qrCodeUrl });
  } catch (error) {
    console.error("Generate QR Code API error:", error);
    res.status(500).json({
      message: "Failed to generate QR code.",
      error: (error as Error).message,
    });
  }
}
