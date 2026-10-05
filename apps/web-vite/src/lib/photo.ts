/**
 * A picture chosen by the student, cropped to a centred square and shrunk to `size` pixels as a JPEG data URL, so a
 * phone photo of several megabytes becomes about 20 to 40 KB before it is sent.
 */
export function squarePhoto(file: File, size = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) { reject(new Error('Choose a JPEG, PNG or WebP picture')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('This browser cannot prepare the picture')); return; }
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size, size);   // transparent PNGs get a white background
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as a picture')); };
    img.src = url;
  });
}
