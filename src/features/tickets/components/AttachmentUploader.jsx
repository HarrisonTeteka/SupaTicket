import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { uploadAttachment } from '../services/attachmentsService';
import { MAX_ATTACHMENT_BYTES, formatBytes } from '../tickets.utils';
import { Button } from '../../../shared/components/Button';

/**
 * "Attach file" button. Validates the 10 MB cap client-side, uploads to the
 * ticket-attachments bucket, and reports the new attachments array via
 * `onChange`.
 */
export function AttachmentUploader({ ticket, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`File too large — max ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
      return;
    }

    setError('');
    setBusy(true);
    try {
      const next = await uploadAttachment(ticket, file);
      onChange?.(next);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={14} /> Attach file
      </Button>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
