import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/components/AuthGate';
import {
  bulkUpsertCustomers,
} from '../services/customerService';
import {
  CUSTOMER_COLUMNS,
  CUSTOMER_FIELD_LABELS,
  csvTemplate,
  parseCustomersCsv,
} from '../customers.utils';

/**
 * Three-step CSV importer: pick file → preview/validate → import.
 * Stays mounted via `open` so the result summary survives close.
 */
export function CustomerImportModal({ open, onClose, onImported }) {
  const { profile } = useAuth();
  const fileInput = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { rows, errors, headerMap, duplicates }
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!open) return null;

  const reset = () => {
    setFileName('');
    setParsed(null);
    setResult(null);
    setServerError('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setServerError('');
    try {
      const text = await file.text();
      setParsed(parseCustomersCsv(text));
    } catch (err) {
      setServerError(err.message || 'Could not read file.');
    }
  };

  const importNow = async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);
    setServerError('');
    try {
      const r = await bulkUpsertCustomers(parsed.rows, profile);
      setResult(r);
      onImported?.(r);
    } catch (err) {
      setServerError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Import customers from CSV"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Close</Button>
          {result ? null : (
            <Button
              loading={importing}
              onClick={importNow}
              disabled={!parsed?.rows?.length}
            >
              Import {parsed?.rows?.length || 0} customer{parsed?.rows?.length === 1 ? '' : 's'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Header / template */}
        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-bold text-[#336021]">CSV format</p>
            <p>
              Required columns: <code className="text-[12px]">external_id</code>,{' '}
              <code className="text-[12px]">name</code>. Optional:{' '}
              {CUSTOMER_COLUMNS.filter((c) => !['external_id', 'name'].includes(c)).map((c, i, a) => (
                <span key={c}>
                  <code className="text-[12px]">{c}</code>
                  {i < a.length - 1 ? ', ' : ''}
                </span>
              ))}.
            </p>
            <p className="text-xs text-gray-400">
              Re-importing a row matches on <code>external_id</code> (case-insensitive) and updates the existing record.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <Download size={14} /> Template
          </Button>
        </div>

        {/* File picker */}
        <div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#336021] hover:text-[#336021] transition-all"
          >
            <Upload size={18} />
            {fileName ? <span className="font-bold">{fileName}</span> : 'Choose a CSV file'}
          </button>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {serverError}
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm">
              <CheckCircle2 size={16} />
              <span>
                Imported <strong>{result.inserted}</strong> new,{' '}
                <strong>{result.updated}</strong> updated,{' '}
                <strong>{result.failed.length}</strong> failed.
              </span>
            </div>
            {result.failed.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm">
                <p className="font-bold text-red-700 mb-1">Failed rows</p>
                <ul className="text-red-700 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                  {result.failed.map((f) => (
                    <li key={f.row}>Row {f.row + 2}: {f.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Validation errors */}
        {!result && parsed?.errors?.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
              <AlertCircle size={16} /> {parsed.errors.length} row{parsed.errors.length === 1 ? '' : 's'} skipped
            </div>
            <ul className="text-amber-800 text-xs space-y-0.5 max-h-32 overflow-y-auto">
              {parsed.errors.slice(0, 50).map((e, i) => (
                <li key={i}>Row {e.row}: {e.message}</li>
              ))}
              {parsed.errors.length > 50 && (
                <li className="italic">…and {parsed.errors.length - 50} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview */}
        {!result && parsed?.rows?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Preview · first {Math.min(parsed.rows.length, 20)} of {parsed.rows.length}
              </p>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider">
                  <tr>
                    {['external_id', 'name', 'email', 'company', 'city', 'country'].map((c) => (
                      <th key={c} className="px-3 py-2 text-left">{CUSTOMER_FIELD_LABELS[c]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-bold text-[#336021]">{r.external_id}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.company || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.city || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.country || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
