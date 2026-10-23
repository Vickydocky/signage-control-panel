/**
 * Bersihkan input pencarian sebelum dipakai di filter PostgREST `.or(...)`.
 * Karakter khusus (koma, kurung, wildcard) dibuang agar filter tidak bisa disisipi.
 */
export function sanitizeSearch(q?: string): string {
  return (q ?? '').replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export const pageRange = (page: number, pageSize: number) => {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
};
