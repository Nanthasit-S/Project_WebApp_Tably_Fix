import type { NextApiRequest, NextApiResponse } from "next";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { readUiTexts, updateUiText, writeUiTexts } from "@/lib/ui-texts";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["GET", "PUT", "POST"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  try {
    if (req.method === "GET") {
      const texts = await readUiTexts();

      res.status(200).json({ texts });

      return;
    }

    const { key, value, texts } = req.body as {
      key?: string;
      value?: string;
      texts?: Record<string, string>;
    };

    if (req.method === "PUT") {
      if (!key) {
        res.status(400).json({ message: "Key is required." });

        return;
      }
      const updated = await updateUiText(key, value ?? "");

      res.status(200).json({ texts: updated });

      return;
    }

    if (req.method === "POST") {
      if (!texts || typeof texts !== "object") {
        res
          .status(400)
          .json({ message: 'Payload must include a "texts" object.' });

        return;
      }
      await writeUiTexts(texts);
      res.status(200).json({ texts });

      return;
    }
  } catch (error) {
    console.error("UI texts API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
