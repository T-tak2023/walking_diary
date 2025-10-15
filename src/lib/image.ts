'use client';

export async function fileToResizedDataUrl(
  file: File,
  maxSize: number
): Promise<string> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const { canvas, context } = createCanvas(img, maxSize);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createCanvas(img: HTMLImageElement, maxSize: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create canvas context');
  }
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  return { canvas, context };
}
