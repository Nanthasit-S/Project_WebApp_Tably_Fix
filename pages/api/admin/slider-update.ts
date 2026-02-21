import type { NextApiRequest, NextApiResponse } from "next";

import path from "path";
import { URL } from "url";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

import { Formidable } from "formidable";

import { ensureHttpMethod, requireSession } from "@/lib/api-utils";
import { withConnection } from "@/lib/db";
import {
  deleteFromSupabaseStorage,
  uploadToSupabaseStorage,
} from "@/lib/supabase";

export const config = {
  api: {
    bodyParser: false,
  },
};

type EventRow = { image_url: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureHttpMethod(req, res, ["POST"])) {
    return;
  }

  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  try {
    const form = new Formidable({});
    const [fields, files] = await form.parse(req);

    const idValue = fields.id?.[0];

    if (!idValue) {
      res.status(400).json({ message: "Event ID is required." });

      return;
    }

    const eventId = Number(idValue);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      res.status(400).json({ message: "Invalid event ID." });

      return;
    }

    const title = fields.title?.[0] ?? null;
    const date = fields.date?.[0] ?? null;
    const description = fields.description?.[0] ?? null;
    const altText = fields.altText?.[0] ?? null;
    const price = parseFloat(fields.price?.[0] || "0");
    const totalTickets = parseInt(fields.totalTickets?.[0] || "0", 10);
    const isActive = fields.isActive?.[0] === "true";
    const newImageFile = files.image?.[0];
    const newImageUrl = fields.imageUrl?.[0];

    const existingEvent = await withConnection(async (conn) => {
      const rows = (await conn.query(
        "SELECT image_url FROM events WHERE id = ?",
        [eventId],
      )) as EventRow[];

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    });

    if (!existingEvent) {
      res.status(404).json({ message: "Event not found." });

      return;
    }

    let updatedImageUrl = existingEvent.image_url;

    if (newImageFile || newImageUrl) {
      if (newImageFile) {
        const buffer = await fs.readFile(newImageFile.filepath);
        const extension = newImageFile.originalFilename?.includes(".")
          ? newImageFile.originalFilename.slice(
              newImageFile.originalFilename.lastIndexOf("."),
            )
          : ".jpg";
        const fileName = `events/${Date.now()}-${uuidv4()}${extension}`;

        updatedImageUrl = await uploadToSupabaseStorage({
          buffer,
          path: fileName,
          contentType: newImageFile.mimetype || undefined,
        });
        await fs.unlink(newImageFile.filepath).catch(() => null);
      } else if (newImageUrl) {
        const imageResponse = await fetch(newImageUrl);

        if (!imageResponse.ok) {
          throw new Error("Failed to fetch image from URL");
        }
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const externalPath = path.basename(new URL(newImageUrl).pathname);
        const extension = externalPath.includes(".")
          ? externalPath.slice(externalPath.lastIndexOf("."))
          : ".jpg";
        const fileName = `events/${Date.now()}-${uuidv4()}${extension}`;

        updatedImageUrl = await uploadToSupabaseStorage({
          buffer,
          path: fileName,
          contentType: imageResponse.headers.get("content-type") || undefined,
        });
      }
      if (existingEvent.image_url) {
        try {
          await deleteFromSupabaseStorage(existingEvent.image_url);
        } catch (error) {
          console.error("Could not delete old file from storage", error);
        }
      }
    }

    await withConnection((conn) =>
      conn.query(
        "UPDATE events SET image_url = ?, alt_text = ?, title = ?, date = ?, description = ?, price = ?, total_tickets = ?, is_active = ? WHERE id = ?",
        [
          updatedImageUrl,
          altText,
          title,
          date,
          description,
          price,
          totalTickets,
          isActive,
          eventId,
        ],
      ),
    );

    res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    console.error("Update Slider API Error:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
}
