import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  await requireSession(req, res);

  res.status(410).json({
    message:
      "Direct booking creation has moved to /api/bookings/create-order. Please update your client to use the new endpoint.",
  });
}
