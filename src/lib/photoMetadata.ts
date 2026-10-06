import { parse } from "exifr";

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== "string") return undefined;

  const parts = value.match(/^(\d{4})[-:](\d{2})[-:](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return undefined;
  const [, year, month, day, hour, minute, second] = parts;
  const date = new Date(
    Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second),
  );
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export async function photoDateOrNow(file: File): Promise<Date> {
  const uploadedAt = new Date();
  if (!file.type.startsWith("image/") && !/\.hei[cf]$/i.test(file.name)) return uploadedAt;

  try {
    const tags = await parse(file, ["DateTimeOriginal", "CreateDate", "ModifyDate"]);
    return asDate(tags?.DateTimeOriginal) ?? asDate(tags?.CreateDate) ?? asDate(tags?.ModifyDate) ?? uploadedAt;
  } catch {
    return uploadedAt;
  }
}

export function toLocalDateTimeInput(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(value.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function localDateTimeToIso(value: string) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) throw new Error("Indicá una fecha y hora válidas.");
  return date.toISOString();
}

export function formatPhotoDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha sin definir";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
