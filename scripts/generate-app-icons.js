/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');

const OUT = {
  iosIcon: path.join(ROOT, 'assets', 'images', 'icon.png'),
  androidBg: path.join(ROOT, 'assets', 'images', 'android-icon-background.png'),
  androidFg: path.join(ROOT, 'assets', 'images', 'android-icon-foreground.png'),
  androidMono: path.join(ROOT, 'assets', 'images', 'android-icon-monochrome.png'),
};

const SIZE = 1024;

const COLORS = {
  mintA: hex('#00D9F5'),
  mintB: hex('#00F5D0'),
  mintC: hex('#B4F8C8'),
  ink: hex('#1A1A2E'),
  white: { r: 255, g: 255, b: 255, a: 255 },
  bluePin: hex('#1296F7'),
  bluePin2: hex('#00D9F5'),
  greenPin: hex('#2DD36F'),
  greenPin2: hex('#B4F8C8'),
};

function hex(value) {
  const v = value.replace('#', '').trim();
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b, a: 255 };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
    a: Math.round(lerp(c1.a ?? 255, c2.a ?? 255, t)),
  };
}

function put(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = rgba.r;
  png.data[idx + 1] = rgba.g;
  png.data[idx + 2] = rgba.b;
  png.data[idx + 3] = rgba.a;
}

function blendOver(dst, src) {
  const sa = (src.a ?? 255) / 255;
  const da = (dst.a ?? 255) / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const r = (src.r * sa + dst.r * da * (1 - sa)) / outA;
  const g = (src.g * sa + dst.g * da * (1 - sa)) / outA;
  const b = (src.b * sa + dst.b * da * (1 - sa)) / outA;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(outA * 255) };
}

function putBlend(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  const dst = {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
  const out = blendOver(dst, rgba);
  png.data[idx] = out.r;
  png.data[idx + 1] = out.g;
  png.data[idx + 2] = out.b;
  png.data[idx + 3] = out.a;
}

function fill(png, rgba) {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) put(png, x, y, rgba);
  }
}

function fillGradient(png) {
  // 3-stop diagonal gradient to match the app theme.
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const u = x / (png.width - 1);
      const v = y / (png.height - 1);
      const t = clamp01(0.55 * u + 0.45 * v);
      const mid = clamp01((t - 0.15) / 0.7);
      const cAB = mix(COLORS.mintA, COLORS.mintB, mid);
      const c = mix(cAB, COLORS.mintC, clamp01((t - 0.6) / 0.4));
      put(png, x, y, c);
    }
  }

  // Vignette for depth.
  const cx = (png.width - 1) / 2;
  const cy = (png.height - 1) / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / maxD;
      const shade = clamp01((d - 0.25) / 0.75);
      const idx = (png.width * y + x) << 2;
      png.data[idx] = Math.round(png.data[idx] * (1 - 0.18 * shade));
      png.data[idx + 1] = Math.round(png.data[idx + 1] * (1 - 0.18 * shade));
      png.data[idx + 2] = Math.round(png.data[idx + 2] * (1 - 0.18 * shade));
    }
  }
}

function drawLine(png, x0, y0, x1, y1, rgba, width = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
      for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
        putBlend(png, x + ox, y + oy, rgba);
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawCircle(png, cx, cy, radius, rgba, fillMode = true) {
  const r2 = radius * radius;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (fillMode) {
        if (d2 <= r2) putBlend(png, x, y, rgba);
      } else {
        const d = Math.sqrt(d2);
        if (Math.abs(d - radius) <= 1.2) putBlend(png, x, y, rgba);
      }
    }
  }
}

function drawRoundedRect(png, x, y, w, h, r, rgba) {
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const rx = px < x0 + r ? x0 + r - px : px > x1 - r ? px - (x1 - r) : 0;
      const ry = py < y0 + r ? y0 + r - py : py > y1 - r ? py - (y1 - r) : 0;
      if (rx === 0 || ry === 0 || rx * rx + ry * ry <= r * r) putBlend(png, px, py, rgba);
    }
  }
}

function drawMapGrid(png) {
  const gridColor = { ...COLORS.white, a: 90 };
  const gridColor2 = { ...COLORS.white, a: 55 };

  // Thick “roads”
  for (let i = -2; i <= 6; i++) {
    const y = Math.round((i * 160) + 190);
    drawLine(png, 0, y, SIZE, y + 140, gridColor, 26);
  }
  for (let i = -2; i <= 6; i++) {
    const x = Math.round((i * 170) + 100);
    drawLine(png, x, 0, x + 160, SIZE, gridColor2, 18);
  }

  // Soft highlight blocks
  for (let i = 0; i < 10; i++) {
    const bx = 90 + (i % 5) * 190 + (i % 2) * 14;
    const by = 170 + Math.floor(i / 5) * 250 + (i % 3) * 12;
    drawRoundedRect(png, bx, by, 150, 110, 22, { ...COLORS.white, a: 45 });
  }
}

function drawSparkles(png) {
  const sparkle = { ...COLORS.white, a: 200 };
  const points = [
    [760, 220, 10],
    [820, 250, 8],
    [700, 180, 7],
    [640, 240, 6],
    [840, 190, 7],
  ];
  for (const [x, y, s] of points) {
    drawLine(png, x - s, y, x + s, y, sparkle, 2);
    drawLine(png, x, y - s, x, y + s, sparkle, 2);
    drawLine(png, x - Math.round(s * 0.7), y - Math.round(s * 0.7), x + Math.round(s * 0.7), y + Math.round(s * 0.7), { ...sparkle, a: 130 }, 2);
    drawLine(png, x - Math.round(s * 0.7), y + Math.round(s * 0.7), x + Math.round(s * 0.7), y - Math.round(s * 0.7), { ...sparkle, a: 130 }, 2);
  }
}

function drawDottedPath(png, points, dotRadius, rgba, spacing = 26) {
  // Approximate by walking along segments.
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const steps = Math.floor(len / spacing);
    for (let s = 0; s <= steps; s++) {
      const t = s / Math.max(1, steps);
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      drawCircle(png, x, y, dotRadius, rgba, true);
    }
  }
}

function drawPin(png, cx, cy, scale, gradientA, gradientB, hasDollar) {
  // Pin body (simple teardrop): circle + triangle.
  const r = 78 * scale;
  // Shadow
  drawCircle(png, cx + 14 * scale, cy + 84 * scale, 64 * scale, { r: 0, g: 0, b: 0, a: 40 }, true);

  // Gradient fill: draw concentric circles for cheap shading.
  for (let i = Math.floor(r); i >= 0; i--) {
    const t = 1 - i / r;
    const col = mix(gradientA, gradientB, clamp01(t));
    col.a = 255;
    drawCircle(png, cx, cy, i, col, true);
  }

  // Inner ring
  drawCircle(png, cx, cy, 56 * scale, { ...COLORS.white, a: 70 }, false);

  // Teardrop tail
  const tailH = 150 * scale;
  const tailW = 86 * scale;
  for (let y = 0; y < tailH; y++) {
    const t = y / tailH;
    const half = (tailW * (1 - t)) / 2;
    const yy = Math.round(cy + r * 0.55 + y);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const col = mix(gradientA, gradientB, clamp01(t));
      col.a = 255;
      putBlend(png, x, yy, col);
    }
  }

  // Highlight
  drawCircle(png, cx - 18 * scale, cy - 18 * scale, 26 * scale, { ...COLORS.white, a: 170 }, true);

  if (!hasDollar) {
    drawCircle(png, cx, cy - 6 * scale, 36 * scale, { ...COLORS.white, a: 220 }, true);
    drawCircle(png, cx, cy - 6 * scale, 36 * scale, { r: 0, g: 0, b: 0, a: 10 }, false);
    return;
  }

  // Dollar sign (blocky, drawn from lines)
  const ink = { ...COLORS.white, a: 235 };
  const s = 44 * scale;
  drawLine(png, cx, cy - s, cx, cy + s, ink, 12 * scale);
  drawLine(png, cx - s * 0.6, cy - s * 0.55, cx + s * 0.55, cy - s * 0.55, ink, 12 * scale);
  drawLine(png, cx - s * 0.55, cy, cx + s * 0.6, cy, ink, 12 * scale);
  drawLine(png, cx - s * 0.6, cy + s * 0.55, cx + s * 0.55, cy + s * 0.55, ink, 12 * scale);
}

function renderBase({ transparent = false } = {}) {
  const png = new PNG({ width: SIZE, height: SIZE });
  if (transparent) fill(png, { r: 0, g: 0, b: 0, a: 0 });
  else fillGradient(png);
  if (!transparent) drawMapGrid(png);
  if (!transparent) drawSparkles(png);
  return png;
}

function renderForeground() {
  const png = renderBase({ transparent: true });

  // Path + pins
  const pathColor = { r: 0, g: 150, b: 90, a: 210 };
  drawDottedPath(
    png,
    [
      [260, 520],
      [340, 580],
      [420, 640],
      [520, 660],
      [620, 650],
      [710, 690],
    ],
    10,
    pathColor,
    30
  );

  drawPin(png, 310, 420, 0.82, COLORS.bluePin, COLORS.bluePin2, false);
  drawPin(png, 700, 520, 1.12, COLORS.greenPin, COLORS.greenPin2, true);

  return png;
}

function renderFullIcon() {
  const base = renderBase({ transparent: false });
  const fg = renderForeground();
  // Composite foreground onto base
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (SIZE * y + x) << 2;
      const src = { r: fg.data[idx], g: fg.data[idx + 1], b: fg.data[idx + 2], a: fg.data[idx + 3] };
      if (src.a === 0) continue;
      const dst = { r: base.data[idx], g: base.data[idx + 1], b: base.data[idx + 2], a: base.data[idx + 3] };
      const out = blendOver(dst, src);
      base.data[idx] = out.r;
      base.data[idx + 1] = out.g;
      base.data[idx + 2] = out.b;
      base.data[idx + 3] = 255;
    }
  }
  return base;
}

function renderAndroidBackground() {
  return renderBase({ transparent: false });
}

function renderMonochrome() {
  const png = new PNG({ width: SIZE, height: SIZE });
  fill(png, { r: 0, g: 0, b: 0, a: 0 });

  const mono = { r: 255, g: 255, b: 255, a: 255 };
  // Simple pin mark
  drawCircle(png, 512, 420, 220, mono, true);
  drawCircle(png, 512, 420, 140, { r: 0, g: 0, b: 0, a: 0 }, true);
  for (let y = 0; y < 340; y++) {
    const t = y / 340;
    const half = 230 * (1 - t);
    const yy = Math.round(520 + y);
    for (let x = Math.round(512 - half); x <= Math.round(512 + half); x++) putBlend(png, x, yy, mono);
  }
  // Dollar line
  drawLine(png, 512, 300, 512, 560, mono, 40);
  drawLine(png, 420, 350, 604, 350, mono, 40);
  drawLine(png, 420, 430, 604, 430, mono, 40);
  drawLine(png, 420, 510, 604, 510, mono, 40);

  return png;
}

function writePng(png, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buf = PNG.sync.write(png, { colorType: 6 });
  fs.writeFileSync(outPath, buf);
}

function main() {
  const ios = renderFullIcon();
  const bg = renderAndroidBackground();
  const fg = renderForeground();
  const mono = renderMonochrome();

  writePng(ios, OUT.iosIcon);
  writePng(bg, OUT.androidBg);
  writePng(fg, OUT.androidFg);
  writePng(mono, OUT.androidMono);

  console.log('Wrote:');
  Object.values(OUT).forEach((p) => console.log(' -', path.relative(ROOT, p)));
}

main();
