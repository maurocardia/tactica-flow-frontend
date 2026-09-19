import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { fieldInputClass } from '@/components/ui/Field';
import { ApiService } from '@/services/api.service';
import { BotContact, BulkImportContact, BulkImportResult } from '@/types/botContact';

const PHONE_HEADER_RE = /tel[eé]fono|phone|n[uú]mero|numero|celular|whatsapp/i;
const NAME_HEADER_RE = /nombre|name/i;
const STATUS_HEADER_RE = /activ|estado|enabled|status/i;
const TRUTHY_VALUES = new Set(['si', 'sí', 'yes', 'true', '1', 'activo', 'x', 'on']);
// Valores que en la columna de estado del archivo significan "bloquear" (van a la pestaña
// Blacklist del panel) en vez de solo "desactivar" el switch del bot.
const BLOCKED_VALUES = new Set(['bloqueado', 'bloquear', 'bloqueo', 'blacklist', 'block', 'blocked', 'lista negra']);

const onlyDigits = (s: string) => s.replace(/[^0-9]/g, '');

function parseEnabledValue(raw: string | undefined): boolean {
  if (!raw) return false;
  return TRUTHY_VALUES.has(raw.trim().toLowerCase());
}

function parseBlockedValue(raw: string | undefined): boolean {
  if (!raw) return false;
  return BLOCKED_VALUES.has(raw.trim().toLowerCase());
}

// Lee el archivo y devuelve filas crudas como matriz de strings (primera fila = headers) — CSV se
// parsea con papaparse (liviano, sin vulnerabilidades conocidas) y XLSX con la librería `xlsx`
// (SheetJS), la única forma práctica de leer el formato binario real de Excel en el navegador.
// Ambas se importan de forma DINÁMICA (en vez de arriba, con el resto de imports) para que Vite
// las separe en su propio chunk — sin esto, `xlsx` (pesada) quedaba pegada al bundle de
// content.js, que se inyecta en CADA carga de WhatsApp Web aunque nadie use el importador nunca.
// Así solo se descargan la primera vez que alguien realmente abre "Importar Excel/CSV".
async function parseFileToRows(file: File): Promise<string[][]> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv') {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return result.data as string[][];
  }
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, blankrows: false, defval: '' });
  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
}

interface ParsedRow {
  phone: string;
  name: string;
  fileEnabled: boolean;
  fileBlocked: boolean;
  isNew: boolean;
}

type OverrideMode = 'file' | 'enable_all' | 'disable_all' | 'block_all';

interface Props {
  file: File;
  existingContacts: BotContact[];
  onCancel: () => void;
  onImported: (result: BulkImportResult) => void;
}

export const BulkImportPreview: React.FC<Props> = ({ file, existingContacts, onCancel, onImported }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [phoneCol, setPhoneCol] = useState<number>(-1);
  const [nameCol, setNameCol] = useState<number>(-1);
  const [statusCol, setStatusCol] = useState<number>(-1);
  const [override, setOverride] = useState<OverrideMode>('file');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setParsing(true);
    setParseError(null);
    parseFileToRows(file)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          setParseError('El archivo está vacío.');
          return;
        }
        const [headerRow, ...rest] = rows;
        setHeaders(headerRow.map((h) => h.trim()));
        setDataRows(rest.filter((r) => r.some((cell) => cell.trim())));
        setPhoneCol(headerRow.findIndex((h) => PHONE_HEADER_RE.test(h)));
        setNameCol(headerRow.findIndex((h) => NAME_HEADER_RE.test(h)));
        setStatusCol(headerRow.findIndex((h) => STATUS_HEADER_RE.test(h)));
      })
      .catch((err) => {
        console.error('[BulkImportPreview] No se pudo leer el archivo:', err);
        if (!cancelled) setParseError('No se pudo leer el archivo. Verificá que sea un CSV o Excel válido.');
      })
      .finally(() => {
        if (!cancelled) setParsing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const existingPhones = useMemo(() => new Set(existingContacts.map((c) => onlyDigits(c.jid.split('@')[0]))), [existingContacts]);

  const needsColumnPicker = !parsing && !parseError && (phoneCol === -1 || nameCol === -1);

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (phoneCol === -1) return [];
    return dataRows
      .map((row) => {
        const phone = onlyDigits(row[phoneCol] || '');
        const name = nameCol !== -1 ? (row[nameCol] || '').trim() : '';
        const fileBlocked = statusCol !== -1 ? parseBlockedValue(row[statusCol]) : false;
        const fileEnabled = statusCol !== -1 ? parseEnabledValue(row[statusCol]) : false;
        return { phone, name, fileEnabled, fileBlocked, isNew: !existingPhones.has(phone) };
      })
      .filter((r) => r.phone.length >= 8); // descarta filas sin un teléfono usable
  }, [dataRows, phoneCol, nameCol, statusCol, existingPhones]);

  const effectiveBlocked = (row: ParsedRow) =>
    override === 'file' ? row.fileBlocked : override === 'block_all';

  const effectiveEnabled = (row: ParsedRow) =>
    effectiveBlocked(row) ? false : override === 'file' ? row.fileEnabled : override === 'enable_all';

  const newCount = parsedRows.filter((r) => r.isNew).length;
  const updateCount = parsedRows.length - newCount;

  const handleConfirm = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const contacts: BulkImportContact[] = parsedRows.map((r) => ({
        phone: r.phone,
        name: r.name || undefined,
        enabled: effectiveEnabled(r),
        blacklisted: effectiveBlocked(r) || undefined,
      }));
      const result = await ApiService.bulkImportBotContacts(contacts);
      onImported(result);
    } catch (err) {
      console.error('[BulkImportPreview] Error al importar:', err);
      setImportError(err instanceof Error ? err.message : 'No se pudo completar la importación. Probá de nuevo.');
    } finally {
      setImporting(false);
    }
  };

  if (parsing) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Leyendo archivo...
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {parseError}
        </div>
        <button
          onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
        Vista previa de <span className="font-mono">{file.name}</span>
      </p>

      {needsColumnPicker && (
        <div className="flex flex-col gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5">
          <p className="text-[10.5px] text-amber-800 dark:text-amber-300 font-semibold">
            No se detectaron automáticamente todas las columnas — elegilas a mano:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">Columna de teléfono</span>
              <select
                className={fieldInputClass}
                value={phoneCol}
                onChange={(e) => setPhoneCol(Number(e.target.value))}
              >
                <option value={-1}>Elegir...</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Columna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">Columna de nombre</span>
              <select className={fieldInputClass} value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))}>
                <option value={-1}>Ninguna</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Columna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {phoneCol !== -1 && (
        <>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-[10.5px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left font-bold px-2 py-1.5">Teléfono</th>
                  <th className="text-left font-bold px-2 py-1.5">Nombre</th>
                  <th className="text-left font-bold px-2 py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="text-slate-700 dark:text-slate-300">
                    <td className="px-2 py-1 font-mono">+{r.phone}</td>
                    <td className="px-2 py-1 truncate max-w-[100px]">{r.name || '—'}</td>
                    <td className={`px-2 py-1 font-semibold ${effectiveBlocked(r) ? 'text-red-600' : effectiveEnabled(r) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {effectiveBlocked(r) ? 'Bloquear' : effectiveEnabled(r) ? 'Activar' : 'Desactivar'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 10 && (
            <p className="text-[10px] text-slate-400 text-center">...y {parsedRows.length - 10} fila{parsedRows.length - 10 === 1 ? '' : 's'} más</p>
          )}

          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Se importarán {parsedRows.length} contacto{parsedRows.length === 1 ? '' : 's'} ({newCount} nuevo{newCount === 1 ? '' : 's'}, {updateCount} actualización{updateCount === 1 ? '' : 'es'})
          </p>

          <label className="flex flex-col gap-0.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">Estado del bot para todos</span>
            <select className={fieldInputClass} value={override} onChange={(e) => setOverride(e.target.value as OverrideMode)}>
              <option value="file">Usar el valor de cada fila del archivo</option>
              <option value="enable_all">Activar bot para todos</option>
              <option value="disable_all">Desactivar bot para todos</option>
              <option value="block_all">Bloquear a todos (Blacklist)</option>
            </select>
          </label>

          {importError && <p className="text-[10.5px] text-red-600">{importError}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={importing}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing || parsedRows.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmar importación
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkImportPreview;
