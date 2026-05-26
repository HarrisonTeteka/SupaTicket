/**
 * Pure helpers for the customers feature: CSV column mapping, validation
 * and a tiny CSV parser. No JSX, no network.
 */

/** All columns the import recognises. Order matters — used for the CSV template. */
export const CUSTOMER_COLUMNS = [
  'external_id',
  'name',
  'email',
  'phone',
  'company',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
  'notes',
];

/** Human labels for the form and the import preview. */
export const CUSTOMER_FIELD_LABELS = {
  external_id: 'External ID',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  address_line1: 'Address line 1',
  address_line2: 'Address line 2',
  city: 'City',
  state: 'State / Region',
  postal_code: 'Postal code',
  country: 'Country',
  notes: 'Notes',
};

/** Required columns for an import row to be acceptable. */
const REQUIRED_FIELDS = ['external_id', 'name'];

/**
 * Header aliases — map common CRM exports to our canonical column names.
 * Case- and whitespace-insensitive. Anything not matched is dropped.
 */
const HEADER_ALIASES = {
  external_id: ['external_id', 'externalid', 'id', 'crm_id', 'customer_id', 'ref'],
  name: ['name', 'full_name', 'fullname', 'customer_name', 'contact_name'],
  email: ['email', 'email_address', 'e-mail'],
  phone: ['phone', 'phone_number', 'mobile', 'telephone', 'tel'],
  company: ['company', 'organisation', 'organization', 'account'],
  address_line1: ['address_line1', 'address1', 'address', 'street', 'street_address'],
  address_line2: ['address_line2', 'address2'],
  city: ['city', 'town'],
  state: ['state', 'region', 'province', 'county'],
  postal_code: ['postal_code', 'postcode', 'zip', 'zip_code'],
  country: ['country'],
  notes: ['notes', 'note', 'comments', 'description'],
};

function normalise(s) {
  return String(s || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Map raw CSV header names to our canonical field names. Unknown → null. */
export function buildHeaderMap(headers) {
  const lookup = new Map();
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) lookup.set(a, canonical);
  }
  return headers.map((h) => lookup.get(normalise(h)) ?? null);
}

/**
 * Tiny RFC-4180-ish CSV parser. Handles double-quoted fields with embedded
 * commas, newlines, and `""` escapes. Strips a UTF-8 BOM. Returns a 2-D array
 * of strings (rows × cells). Empty trailing lines are dropped.
 */
export function parseCsv(text) {
  // Strip a UTF-8 BOM if present (Excel exports include one).
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      // CRLF: skip the LF after a CR
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop entirely-empty trailing rows.
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }
  return rows;
}

/**
 * Parse CSV text + map headers + validate. Returns:
 *   {
 *     headerMap: ['external_id', null, 'name', ...],
 *     rows: [{ external_id, name, ... }, ...],
 *     errors: [{ row: <1-based source row>, message }, ...],
 *     duplicates: ['ABC123', ...]   // external_ids that appear twice in this file
 *   }
 */
export function parseCustomersCsv(text) {
  const cells = parseCsv(text);
  if (cells.length === 0) {
    return { headerMap: [], rows: [], errors: [{ row: 0, message: 'Empty file.' }], duplicates: [] };
  }

  const headers = cells[0];
  const headerMap = buildHeaderMap(headers);

  // Need at least external_id and name in the header row.
  const present = new Set(headerMap.filter(Boolean));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !present.has(f));
  if (missingRequired.length > 0) {
    return {
      headerMap,
      rows: [],
      errors: [
        {
          row: 1,
          message: `Missing required column(s): ${missingRequired.join(', ')}.`,
        },
      ],
      duplicates: [],
    };
  }

  const rows = [];
  const errors = [];
  const seenExternalIds = new Map(); // external_id (lower) -> first row index
  const duplicates = new Set();

  for (let r = 1; r < cells.length; r += 1) {
    const line = cells[r];
    if (line.every((c) => c.trim() === '')) continue; // skip blank line

    const record = {};
    line.forEach((value, c) => {
      const field = headerMap[c];
      if (field) record[field] = value.trim();
    });

    const rowErrors = [];
    for (const f of REQUIRED_FIELDS) {
      if (!record[f] || record[f].trim() === '') {
        rowErrors.push(`${CUSTOMER_FIELD_LABELS[f]} is required`);
      }
    }

    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      rowErrors.push('Invalid email');
    }

    if (record.external_id) {
      const key = record.external_id.toLowerCase();
      if (seenExternalIds.has(key)) {
        rowErrors.push(`Duplicate External ID in file (also row ${seenExternalIds.get(key) + 1})`);
        duplicates.add(record.external_id);
      } else {
        seenExternalIds.set(key, r);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: r + 1, message: rowErrors.join('; ') });
    } else {
      rows.push(record);
    }
  }

  return { headerMap, rows, errors, duplicates: [...duplicates] };
}

/** Sample CSV the "Download template" button serves. */
export function csvTemplate() {
  const header = CUSTOMER_COLUMNS.join(',');
  const example = [
    'CRM-001',
    'Jane Doe',
    'jane@example.com',
    '+260 977 000 000',
    'Acme Ltd',
    '12 Cairo Road',
    '',
    'Lusaka',
    'Lusaka Province',
    '10101',
    'Zambia',
    'VIP customer',
  ]
    .map((v) => (v.includes(',') ? `"${v}"` : v))
    .join(',');
  return `${header}\n${example}\n`;
}

/** Build a single-line label from a customer for compact display. */
export function customerSummary(c) {
  if (!c) return '';
  const company = c.company ? ` · ${c.company}` : '';
  const id = c.external_id ? ` [${c.external_id}]` : '';
  return `${c.name}${company}${id}`;
}
