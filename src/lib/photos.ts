const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_RENDER_DIMENSION = 2200;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HEIF_TYPES = new Set(['image/heic', 'image/heif']);

export const photoInputAccept = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

async function renderHeif(file: File) {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, MAX_RENDER_DIMENSION / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('No pudimos convertir esta foto de iPhone. Elegí “Más compatible” en Cámara e intentá otra vez.');
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
}

export async function preparePhoto(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('La foto pesa más de 10 MB. Elegí una imagen más liviana.');
  if (SUPPORTED_TYPES.has(file.type)) return file;
  if (HEIF_TYPES.has(file.type) || /\.hei[cf]$/i.test(file.name)) {
    try {
      const converted = await renderHeif(file);
      if (converted.size > MAX_UPLOAD_BYTES) throw new Error('La foto convertida pesa más de 10 MB. Elegí una imagen más liviana.');
      return converted;
    } catch (error) {
      if (error instanceof Error && error.message.includes('pesa más')) throw error;
      throw new Error('No pudimos convertir esta foto HEIC. Elegí “Más compatible” en Cámara e intentá otra vez.');
    }
  }
  throw new Error('Elegí una foto JPG, PNG, WebP o HEIC.');
}

export const normalizeQuarterTurns = (turns: number) => ((turns % 4) + 4) % 4;

export const rotatedDimensions = (width: number, height: number, turns: number) =>
  normalizeQuarterTurns(turns) % 2 ? { width: height, height: width } : { width, height };

export async function rotatePhoto(file: File, turns: number) {
  const normalizedTurns = normalizeQuarterTurns(turns);
  if (!normalizedTurns) return file;

  const source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_RENDER_DIMENSION / Math.max(source.width, source.height));
  const sourceWidth = Math.round(source.width * scale);
  const sourceHeight = Math.round(source.height * scale);
  const { width, height } = rotatedDimensions(sourceWidth, sourceHeight, normalizedTurns);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('No pudimos preparar la vista previa de esta foto.');
  }

  context.translate(width / 2, height / 2);
  context.rotate((Math.PI / 2) * normalizedTurns);
  context.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('No pudimos rotar esta foto. Intentá con otra imagen.');
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('La foto rotada pesa más de 10 MB. Elegí una imagen más liviana.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
