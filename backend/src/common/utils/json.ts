/** Lee JSON guardado en una columna TEXT sin lanzar errores si el texto no es JSON válido. */
export function leerJson<T>(texto: string | null | undefined, porDefecto: T): T {
  if (!texto) return porDefecto;
  try { return JSON.parse(texto) as T; } catch { return porDefecto; }
}

/** "a, b,c" → ["a", "b", "c"] */
export const lista = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
