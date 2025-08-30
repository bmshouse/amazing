// Texture generator for maze walls
export function generateWallTexture(width = 64, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base stone color
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(0, 0, width, height);

  // Add stone texture with noise
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
  }

  ctx.putImageData(imageData, 0, 0);

  // Add some darker cracks/lines
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const length = Math.random() * 20 + 10;
    const angle = Math.random() * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  return canvas;
}

export function generateBrickTexture(width = 64, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base brick color
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, 0, width, height);

  // Draw brick pattern
  const brickWidth = 16;
  const brickHeight = 8;
  const mortarColor = '#654321';

  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, width, height);

  // Draw bricks
  ctx.fillStyle = '#a0522d';
  for (let y = 0; y < height; y += brickHeight + 2) {
    const offset = (y / (brickHeight + 2)) % 2 === 0 ? 0 : brickWidth / 2;
    for (let x = offset; x < width; x += brickWidth + 2) {
      ctx.fillRect(x, y, brickWidth, brickHeight);
    }
  }

  // Add texture variation
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
