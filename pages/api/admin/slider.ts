import type { NextApiRequest, NextApiResponse } from "next";

import { URL } from "url";
import { promises as fs } from "fs";
import path from "path";
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

type QueryResult = { affectedRows?: number };

const uploadEvent = async (req: NextApiRequest) => {
  const form = new Formidable({});
  const [fields, files] = await form.parse(req);

  const imageFile = files.image?.[0];
  const imageUrlToFetch = fields.imageUrl?.[0];

  if (!imageFile && !imageUrlToFetch) {
    throw new Error("Image file or URL is required.");
  }

  const title = fields.title?.[0] || "Untitled Event";
  const date = fields.date?.[0] || null;
  const description = fields.description?.[0] || "";
  const altText = fields.altText?.[0] || "";
  const price = parseFloat(fields.price?.[0] || "0");
  const totalTickets = parseInt(fields.totalTickets?.[0] || "0", 10);

  let imageUrl = "";

  if (imageFile) {
    const buffer = await fs.readFile(imageFile.filepath);
    const extension = imageFile.originalFilename?.includes(".")
      ? imageFile.originalFilename.slice(
          imageFile.originalFilename.lastIndexOf("."),
        )
      : ".jpg";
    const fileName = `events/${Date.now()}-${uuidv4()}${extension}`;

    imageUrl = await uploadToSupabaseStorage({
      buffer,
      path: fileName,
      contentType: imageFile.mimetype || undefined,
    });
    await fs.unlink(imageFile.filepath).catch(() => null);
  } else if (imageUrlToFetch) {
    const imageResponse = await fetch(imageUrlToFetch);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image from URL: ${imageResponse.statusText}`,
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const externalPath = path.basename(new URL(imageUrlToFetch).pathname);
    const extension = externalPath.includes(".")
      ? externalPath.slice(externalPath.lastIndexOf("."))
      : ".jpg";
    const fileName = `events/${Date.now()}-${uuidv4()}${extension}`;

    imageUrl = await uploadToSupabaseStorage({
      buffer,
      path: fileName,
      contentType: imageResponse.headers.get("content-type") || undefined,
    });
  }

  await withConnection((conn) =>
    conn.query(
      "INSERT INTO events (image_url, alt_text, title, date, description, price, total_tickets) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [imageUrl, altText, title, date, description, price, totalTickets],
    ),
  );
};

const deleteEvent = async (id: number, imageUrl?: string) => {
  const result = (await withConnection((conn) =>
    conn.query("DELETE FROM events WHERE id = ?", [id]),
  )) as QueryResult;

  if ((result.affectedRows ?? 0) === 0) {
    return { deleted: false };
  }

  try {
    await deleteFromSupabaseStorage(imageUrl);

    return { deleted: true };
  } catch (error) {
    console.error("Failed to delete file from storage:", error);

    return { deleted: true, fileDeletionFailed: true };
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await requireSession(req, res, { roles: ["admin"] }))) {
    return;
  }

  if (req.method === "POST") {
    try {
      await uploadEvent(req);
      res.status(201).json({ message: "Event created successfully" });
    } catch (error) {
      console.error("Admin slider upload error:", error);
      res.status(400).json({
        message: (error as Error).message ?? "Failed to create event.",
      });
    }

    return;
  }

  if (req.method === "DELETE") {
    const { id, imageUrl } = req.query;
    const idNumber = Number(id);

    if (
      !Number.isInteger(idNumber) ||
      idNumber <= 0
    ) {
      res.status(400).json({ message: "Missing ID" });

      return;
    }

    try {
      const result = await deleteEvent(
        idNumber,
        typeof imageUrl === "string" ? imageUrl : undefined,
      );

      if (!result.deleted) {
        res.status(404).json({ message: "Event not found" });

        return;
      }
      if (result.fileDeletionFailed) {
        res.status(200).json({
          message: "Event deleted from database, but file deletion failed.",
        });

        return;
      }
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Admin slider delete error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  ensureHttpMethod(req, res, ["POST", "DELETE"]);
}
