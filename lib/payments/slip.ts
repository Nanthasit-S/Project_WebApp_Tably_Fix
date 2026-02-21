import type { NextApiRequest } from "next";
import type formidable from "formidable";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import type { DbConnection } from "@/lib/db";
import { uploadToSupabaseStorage } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { default as formidableLib } from "formidable";

const SLIP_UPLOAD_DIR = path.join(os.tmpdir(), "tably-slip-uploads");
const ensureDirExists = async (dirPath: string) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (mkdirError) {
        console.error(`Failed to create directory: ${dirPath}`, mkdirError);
        throw mkdirError;
      }
    } else {
      console.error(`Failed to access directory: ${dirPath}`, error);
      throw error;
    }
  }
};

export const parseSlipUpload = async ( 
  req: NextApiRequest,
): Promise<{ fields: formidable.Fields; files: formidable.Files; error?: any }> => {
  
  try {
    await ensureDirExists(SLIP_UPLOAD_DIR);
  } catch (dirError: any) {
    console.error("Failed to ensure upload directory exists:", dirError);
    return { fields: {}, files: {}, error: new Error(dirError.message) };
  }

  const form = formidableLib({
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024,
    uploadDir: SLIP_UPLOAD_DIR, 
    
    filename: (name, ext, part) => {
      const fileExt = path.extname(part.originalFilename || ".jpg");
      return `${uuidv4()}${fileExt}`;
    },
    filter: ({ mimetype }) => {
      return mimetype ? mimetype.includes("image") : false;
    },
  });

  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        let errorMessage = "File parsing error.";
        if (err.code === 1009) {
          errorMessage = "File size exceeds 5MB limit.";
        } else if (err.code === 1004 || err.code === 1003) {
          errorMessage = "Invalid file type. Only images are allowed.";
        }
        console.error("Formidable error:", err);
        resolve({ fields: {}, files: {}, error: new Error(errorMessage) });
        return;
      }
      resolve({ fields, files });
    });
  });
};


type VerificationPayload = {
  refNbr: string;
  amount: string;
  token?: string;
};

type OpenSlipVerifyResponse = {
  success?: boolean;
  msg?: string;
};

export class SlipVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlipVerificationError";
  }
}

const OPENSLIP_ENDPOINT = "https://api.openslipverify.com/";

export const normalizeSlipRef = (refNbr: string): string => refNbr.trim();
export async function verifySlipWithOpenSlip(
  refNbr: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new SlipVerificationError(
      "Invalid payment amount provided for verification.",
    );
  }

  const payload: VerificationPayload = {
    refNbr,
    amount: amount.toFixed(2),
    token: process.env.OPENSLIPVERIFY_TOKEN,
  };

  let response: Response;

  try {
    response = await fetch(OPENSLIP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new SlipVerificationError(
      error instanceof Error
        ? error.message
        : "Unable to contact slip verification service.",
    );
  }

  let data: OpenSlipVerifyResponse = {};

  try {
    data = await response.json();
  } catch {
    throw new SlipVerificationError(
      "Slip verification service returned an invalid response.",
    );
  }

  if (!response.ok || !data.success) {
    throw new SlipVerificationError(
      data.msg || "Automatic slip verification failed.",
    );
  }
}

export async function lockSlipRef(
  conn: DbConnection,
  refNbr: string,
): Promise<boolean> {
  const rows = (await conn.query(
    "SELECT id FROM used_slip_refs WHERE ref_nbr = ? FOR UPDATE",
    [refNbr],
  )) as Array<{
    id: number;
  }>;

  return rows.length > 0;
}

export async function markSlipRefAsUsed(
  conn: DbConnection,
  refNbr: string,
): Promise<void> {
  await conn.query("INSERT INTO used_slip_refs (ref_nbr) VALUES (?)", [refNbr]);
}

export async function uploadSlipToStorage(
  filePath: string,
  originalFilename: string,
): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(originalFilename || "").toLowerCase() || ".jpg";
  const storagePath = `slips/${uuidv4()}${extension}`;

  return uploadToSupabaseStorage({
    buffer,
    path: storagePath,
    contentType: undefined,
  });
}
