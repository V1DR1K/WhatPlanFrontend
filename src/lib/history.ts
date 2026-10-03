import { api } from "./api";
export async function getHistory<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  let cursor: string | number | null | undefined;
  const seen = new Set<string>();
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await api<
      T[] | { content: T[]; nextCursor: string | number | null }
    >(
      `${path}${separator}size=50${cursor != null ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    if (Array.isArray(response)) return response;
    result.push(...response.content);
    cursor = response.nextCursor;
    if (cursor != null) {
      if (seen.has(String(cursor)))
        throw new Error("No pudimos cargar el historial completo. Reintentá.");
      seen.add(String(cursor));
    }
  } while (cursor != null);
  return result;
}
