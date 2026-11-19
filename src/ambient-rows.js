/** Keep a summary first, then rotate each remaining source once. */
export function ambientVisibleRows(rows, clock, limit = 3) {
  const unique = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const identity = row.entity || row.key || row.title + '\n' + (row.detail || '');
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(row);
  }
  if (!unique.length || limit < 1) return [];
  const [first, ...rest] = unique;
  const offset = Math.floor(clock / 20000) % Math.max(1, rest.length);
  return [first, ...Array.from({ length:Math.min(limit - 1, rest.length) }, (_, index) => rest[(offset + index) % rest.length])];
}
