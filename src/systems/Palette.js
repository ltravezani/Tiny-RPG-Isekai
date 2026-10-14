// Troca de paleta em tempo de carga (roteiro, seção 3: aparência; seção 8: variantes Murchas).
// Gera uma textura nova a partir de uma spritesheet já carregada, pixel a pixel.

export const RECOLOR = {
  // Cabelo grisalho: tons de cinza claros mantendo o sombreado.
  grey: (r, g, b) => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    const v = Math.min(255, 90 + l * 0.85);
    return [v, v, Math.min(255, v + 8)];
  },
  // Variante Murcha: puxa para o roxo.
  wither: (r, g, b) => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    return [Math.min(255, l * 0.8 + 40), l * 0.55, Math.min(255, l * 0.9 + 60)];
  },
};

export function recolorSpritesheet(scene, srcKey, dstKey, fn, frameConfig) {
  if (scene.textures.exists(dstKey)) return;
  const img = scene.textures.get(srcKey).getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const [r, g, b] = fn(px[i], px[i + 1], px[i + 2]);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  scene.textures.addSpriteSheet(dstKey, canvas, frameConfig);
}
