/**
 * Composite multiple image URLs into a single grid image (e.g. for "Today's look" OOTD posts).
 * Returns a data URL (png) or throws if any image fails to load (CORS or 404).
 */
const SIZE = 800;
const PAD = 8;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export async function compositeGridImage(imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 0) throw new Error("No images");
  const count = Math.min(imageUrls.length, 4);
  const images = await Promise.all(imageUrls.slice(0, 4).map(loadImage));

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  if (count === 1) {
    ctx.drawImage(images[0]!, 0, 0, SIZE, SIZE);
  } else if (count === 2) {
    const w = (SIZE - PAD * 3) / 2;
    const h = SIZE - PAD * 2;
    ctx.drawImage(images[0]!, PAD, PAD, w, h);
    ctx.drawImage(images[1]!, PAD * 2 + w, PAD, w, h);
  } else if (count === 3) {
    const w = (SIZE - PAD * 3) / 2;
    const h = (SIZE - PAD * 3) / 2;
    ctx.drawImage(images[0]!, PAD, PAD, w, h * 2 + PAD);
    ctx.drawImage(images[1]!, PAD * 2 + w, PAD, w, h);
    ctx.drawImage(images[2]!, PAD * 2 + w, PAD * 2 + h, w, h);
  } else {
    const w = (SIZE - PAD * 3) / 2;
    const h = (SIZE - PAD * 3) / 2;
    ctx.drawImage(images[0]!, PAD, PAD, w, h);
    ctx.drawImage(images[1]!, PAD * 2 + w, PAD, w, h);
    ctx.drawImage(images[2]!, PAD, PAD * 2 + h, w, h);
    ctx.drawImage(images[3]!, PAD * 2 + w, PAD * 2 + h, w, h);
  }

  return canvas.toDataURL("image/png");
}
