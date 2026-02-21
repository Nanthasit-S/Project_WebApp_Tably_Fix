import { createClient } from "@supabase/supabase-js";

export const UPLOADS_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "uploads";

let cachedSupabaseAdmin: ReturnType<typeof createClient> | null = null;

const getSupabaseAdmin = () => {
  if (cachedSupabaseAdmin) {
    return cachedSupabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  cachedSupabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabaseAdmin;
};

type UploadInput = {
  buffer: Buffer;
  path: string;
  contentType?: string;
  upsert?: boolean;
};

export async function uploadToSupabaseStorage({
  buffer,
  path,
  contentType,
  upsert = false,
}: UploadInput): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.storage
    .from(UPLOADS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from(UPLOADS_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${UPLOADS_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function deleteFromSupabaseStorage(
  url: string | null | undefined,
): Promise<void> {
  if (!url) {
    return;
  }

  const path = extractStoragePathFromUrl(url);

  if (!path) {
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage
    .from(UPLOADS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
