import { SupabaseClient } from '@supabase/supabase-js';
import { LogisticsCheckpoint } from '@/types/farmer-operations';

const LOGISTICS_PHOTOS_BUCKET = 'logistics-photos';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

const VERIFICATION_DOCUMENTS_BUCKET = 'verification-documents';
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

export class InvalidUploadError extends Error {}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Generic short-lived signed URL for a private-bucket object. Returns
 * null (rather than throwing) if signing fails, so callers can degrade
 * gracefully instead of breaking an otherwise-successful read.
 */
export async function createSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Validates and uploads an institution verification document, returning
 * its storage path. Called server-side only, via the admin client,
 * after the caller's own pending-verification status has been checked.
 */
export async function uploadVerificationDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new InvalidUploadError('Only PDF, JPEG, or PNG files are allowed');
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new InvalidUploadError('Document must be 10MB or smaller');
  }

  const path = `${userId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(VERIFICATION_DOCUMENTS_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type });

  if (error) throw error;
  return path;
}

export async function getSignedVerificationDocumentUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string | null> {
  return createSignedUrl(supabase, VERIFICATION_DOCUMENTS_BUCKET, path);
}

/**
 * Validates and uploads a checkpoint photo, returning its storage path.
 * Called server-side only, via the admin client, after the caller's
 * permission to manage the logistics plan has already been checked.
 */
export async function uploadLogisticsPhoto(
  supabase: SupabaseClient,
  planId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new InvalidUploadError('Only JPEG, PNG, or WEBP images are allowed');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new InvalidUploadError('Photo must be 5MB or smaller');
  }

  const path = `${planId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(LOGISTICS_PHOTOS_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type });

  if (error) throw error;
  return path;
}

/**
 * Attaches a short-lived signed URL to every checkpoint that has a
 * stored photo_path. Never persisted — recomputed on every read.
 */
export async function enrichCheckpointsWithSignedUrls(
  supabase: SupabaseClient,
  checkpoints: LogisticsCheckpoint[]
): Promise<LogisticsCheckpoint[]> {
  return Promise.all(
    checkpoints.map(async (checkpoint) => {
      if (!checkpoint.photo_path) return checkpoint;

      const signedUrl = await createSignedUrl(supabase, LOGISTICS_PHOTOS_BUCKET, checkpoint.photo_path);
      if (!signedUrl) return checkpoint;
      return { ...checkpoint, photo_url: signedUrl };
    })
  );
}
