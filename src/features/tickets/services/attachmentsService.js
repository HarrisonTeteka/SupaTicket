import { supabase } from '../../../lib/supabase';
import { updateTicket } from './ticketsService';

/**
 * Ticket attachments live in the private `ticket-attachments` Storage bucket;
 * their metadata is mirrored into the `tickets.attachments` jsonb array so the
 * detail view can list them without a separate query.
 */

const BUCKET = 'ticket-attachments';

/**
 * Upload one file for a ticket and append its metadata to tickets.attachments.
 * Returns the new attachments array.
 */
export async function uploadAttachment(ticket, file) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${ticket.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const meta = {
    path,
    name: file.name,
    size: file.size,
    content_type: file.type,
  };
  const next = [...(ticket.attachments ?? []), meta];
  await updateTicket(ticket.id, { attachments: next });
  return next;
}

/** Remove an attachment from both the bucket and tickets.attachments. */
export async function removeAttachment(ticket, path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  const next = (ticket.attachments ?? []).filter((a) => a.path !== path);
  await updateTicket(ticket.id, { attachments: next });
  return next;
}

/** A short-lived signed URL for viewing/downloading a private attachment. */
export async function getAttachmentUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60); // valid for 1 hour
  if (error) throw error;
  return data.signedUrl;
}
