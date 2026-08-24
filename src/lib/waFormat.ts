// Convierte texto con formato Markdown (tablas, **negrita**, encabezados #) al formato que
// WhatsApp sí soporta (negrita con *asterisco simple*, listas línea por línea, sin tablas).
//
// Por qué existe: WhatsApp no renderiza tablas Markdown (`| col | col |` con fila de guiones) —
// las muestra tal cual, con las barras y guiones sueltos, así que una respuesta de IA con una
// tabla de precios se ve amontonada e ilegible en el chat. Esto es un parche del lado del
// frontend (se limpia el texto justo antes de insertarlo en WhatsApp); el arreglo "de raíz"
// sería instruir al modelo desde el prompt de sistema del backend para que no genere Markdown de
// tabla — se decidió no tocar el backend por ahora.
function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false;
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(trimmed);
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.length > 1;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Convierte un bloque de líneas de tabla Markdown (encabezado + separador + filas) en una ficha
 * por producto: nombre en negrita en su propia línea, un atributo por renglón debajo (con la
 * columna de la tabla como etiqueta), y una línea en blanco entre cada producto. Mucho más fácil
 * de leer en WhatsApp que amontonar todo entre paréntesis en un solo renglón. */
function convertTableBlock(lines: string[]): string[] {
  const rows = lines.filter((l) => !isSeparatorRow(l)).map(splitRow);
  if (rows.length === 0) return lines;

  const [header, ...dataRows] = rows;
  const out: string[] = [];

  for (const row of dataRows) {
    if (row.length === 0 || row.every((c) => !c)) continue;
    const [first, ...rest] = row;

    if (out.length > 0) out.push(''); // línea en blanco entre productos

    out.push(`🔹 *${first}*`);
    rest.forEach((val, i) => {
      if (!val) return;
      const label = (header[i + 1] || '').trim();
      out.push(label ? `${label}: ${val}` : val);
    });
  }

  return out.length > 0 ? out : lines;
}

export function formatForWhatsApp(text: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  const out: string[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const hasRealTable = tableBuffer.some(isSeparatorRow) && tableBuffer.length >= 2;
    out.push(...(hasRealTable ? convertTableBlock(tableBuffer) : tableBuffer));
    tableBuffer = [];
  };

  for (const line of lines) {
    if (isTableRow(line)) {
      tableBuffer.push(line);
    } else {
      flushTable();
      out.push(line);
    }
  }
  flushTable();

  return out
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // **negrita** (Markdown) -> *negrita* (WhatsApp)
    .replace(/^#{1,6}\s*(.+)$/gm, '*$1*') // encabezados Markdown -> línea en negrita
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
