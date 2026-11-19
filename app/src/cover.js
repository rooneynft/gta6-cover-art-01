// Draws a multi-panel Vice City style poster cover onto a canvas.
// One canvas is both the live preview and the export: the canvas is sized to the
// chosen post size (1080x1080, 1080x1350 or 1920x1080) and this module paints it.
//
// A cover is a collage of up to three photo panels (a hero panel plus two smaller
// ones), a striped sunset sun drawn in the hero panel, a warm sunset or neon
// colour grade over every panel, and a bold caption band along the foot.

// The three post sizes the app exports.
export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

// The three panel layouts. Each entry lists the panels as fractions of the cover
// (x, y, w, h); panel 0 is always the hero. The caption band sits below them.
export const LAYOUTS = {
  'hero-left': {
    label: 'Hero left',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.83 },
      { x: 0.62, y: 0, w: 0.38, h: 0.415 },
      { x: 0.62, y: 0.415, w: 0.38, h: 0.415 },
    ],
  },
  'hero-top': {
    label: 'Hero top',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.58, w: 0.5, h: 0.25 },
      { x: 0.5, y: 0.58, w: 0.5, h: 0.25 },
    ],
  },
  triptych: {
    label: 'Triptych',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 0.83 },
      { x: 0.34, y: 0, w: 0.32, h: 0.83 },
      { x: 0.66, y: 0, w: 0.34, h: 0.83 },
    ],
  },
};

// The three colour grades: each is a top and bottom wash plus an accent colour
// used for the sub-caption and the rule above the caption.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    top: 'rgba(255, 140, 66, 0.10)',
    bottom: 'rgba(214, 48, 130, 0.34)',
    accent: '#ff7ad9',
    sun: true,
  },
  neon: {
    label: 'Neon night',
    top: 'rgba(0, 229, 255, 0.16)',
    bottom: 'rgba(255, 0, 128, 0.36)',
    accent: '#00e5ff',
    sun: true,
  },
  dusk: {
    label: 'Palm dusk',
    top: 'rgba(255, 170, 0, 0.14)',
    bottom: 'rgba(110, 20, 140, 0.40)',
    accent: '#ffc53d',
    sun: false,
  },
};

/** Returns the panel rectangles (in canvas pixels) for a size and layout. */
export function layoutPanels(sizeKey, layoutKey) {
  const size = SIZES[sizeKey];
  const layout = LAYOUTS[layoutKey];
  return layout.panels.map((p) => ({
    x: Math.round(p.x * size.w),
    y: Math.round(p.y * size.h),
    w: Math.round(p.w * size.w),
    h: Math.round(p.h * size.h),
  }));
}

/** Finds which panel (index) holds the point, or -1 when it holds none. */
export function panelAt(sizeKey, layoutKey, px, py) {
  const panels = layoutPanels(sizeKey, layoutKey);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h) return i;
  }
  return -1;
}

// Where a cover-fitted photo sits inside its panel when it is cropped: centred
// across, but biased toward the top, where faces usually are.
const ANCHOR_X = 0.5;
const ANCHOR_Y = 0.35;

/** The pan limits for a photo in a panel, so it always covers the panel. */
export function panBounds(panel, photo) {
  const base = Math.max(panel.w / photo.img.naturalWidth, panel.h / photo.img.naturalHeight);
  const dw = photo.img.naturalWidth * base * (photo.zoom || 1);
  const dh = photo.img.naturalHeight * base * (photo.zoom || 1);
  return {
    minX: (panel.w - dw) * (1 - ANCHOR_X),
    maxX: -(panel.w - dw) * ANCHOR_X,
    minY: (panel.h - dh) * (1 - ANCHOR_Y),
    maxY: -(panel.h - dh) * ANCHOR_Y,
  };
}

/** Draws one photo into one panel, cover-fitting it with zoom and pan. */
function drawPanelPhoto(ctx, photo, panel) {
  if (!photo || !photo.img) {
    // Empty panel: a deep dusk gradient with a faint diagonal sheen.
    const empty = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
    empty.addColorStop(0, '#3a1c5e');
    empty.addColorStop(1, '#160a2e');
    ctx.fillStyle = empty;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.beginPath();
    ctx.moveTo(panel.x, panel.y + panel.h);
    ctx.lineTo(panel.x + panel.w, panel.y);
    ctx.lineTo(panel.x + panel.w, panel.y + panel.h * 0.4);
    ctx.lineTo(panel.x, panel.y + panel.h);
    ctx.fill();
    return;
  }
  const img = photo.img;
  const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
  const scale = base * (photo.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = panel.x + (panel.w - dw) * ANCHOR_X + (photo.ox || 0);
  const dy = panel.y + (panel.h - dh) * ANCHOR_Y + (photo.oy || 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Draws the striped synthwave sun in the hero panel's top-left sky. */
function drawSun(ctx, panel, w) {
  const r = Math.min(panel.w, panel.h) * 0.19;
  const cx = panel.x + r * 1.15;
  const cy = panel.y + r * 1.15;
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, '#ffe27a');
  sun.addColorStop(0.55, '#ff7a3c');
  sun.addColorStop(1, '#ff2d78');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Horizontal slats cut the sun's lower half, thicker toward the bottom.
  ctx.fillStyle = 'rgba(20, 4, 32, 0.55)';
  let y = cy + r * 0.05;
  let thick = Math.max(2, r * 0.045);
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick * 2.6;
    thick *= 1.35;
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ff9d5c';
  ctx.lineWidth = Math.max(2, w * 0.0015);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Washes one panel with the grade's sunset or neon tint. */
function gradePanel(ctx, panel, grade) {
  const wash = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
}

/** Darkens the cover's edges so the caption band and panels read as one poster. */
function vignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(10, 0, 24, 0)');
  v.addColorStop(1, 'rgba(10, 0, 24, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Fits the caption to one line, shrinking it until it fits the band. */
function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(14, size - 2);
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  return size;
}

/** Draws the caption band: gradient, neon rule, caption and sub-caption. */
function drawCaptionBand(ctx, w, h, caption, sub, grade) {
  const bandH = h * 0.17;
  const bandY = h - bandH;
  const band = ctx.createLinearGradient(0, bandY - h * 0.03, 0, h);
  band.addColorStop(0, 'rgba(18, 4, 32, 0)');
  band.addColorStop(0.35, 'rgba(18, 4, 32, 0.88)');
  band.addColorStop(1, 'rgba(12, 2, 24, 0.96)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - h * 0.03, w, bandH + h * 0.03);
  // Neon rule above the caption.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w * 0.06, bandY + bandH * 0.14, w * 0.88, Math.max(3, h * 0.004));
  const text = (caption || '').trim().toUpperCase();
  if (text) {
    const size = fitFont(ctx, text, w * 0.88, bandH * 0.52);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(10, 0, 20, 0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    const cy = bandY + bandH * 0.48;
    ctx.strokeText(text, w / 2, cy);
    ctx.fillText(text, w / 2, cy);
    ctx.shadowBlur = 0;
  }
  const subText = (sub || '').trim().toUpperCase();
  if (subText) {
    let subSize = Math.max(12, bandH * 0.17);
    ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch { /* older canvas: no letter spacing */ }
    while (subSize > 10 && ctx.measureText(subText).width > w * 0.8) {
      subSize -= 1;
      ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.fillText(subText, w / 2, bandY + bandH * 0.83);
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
  }
}

/**
 * Paints the whole cover. `state` holds size, layout, grade, caption, sub and
 * photos: an array of { img, zoom, ox, oy } (one per panel, img may be null).
 */
export function drawCover(canvas, state) {
  const size = SIZES[state.size];
  const grade = GRADES[state.grade];
  const ctx = canvas.getContext('2d');
  const { w, h } = size;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, w, h);
  const panels = layoutPanels(state.size, state.layout);
  const gutter = Math.max(4, Math.round(w * 0.006));
  panels.forEach((panel, i) => {
    drawPanelPhoto(ctx, state.photos[i], panel);
    gradePanel(ctx, panel, grade);
    // Thin bright gutter around each panel, like a poster's cut lines.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = gutter / 2;
    ctx.strokeRect(panel.x + gutter / 4, panel.y + gutter / 4, panel.w - gutter / 2, panel.h - gutter / 2);
  });
  if (grade.sun) drawSun(ctx, panels[0], w);
  vignette(ctx, w, h);
  drawCaptionBand(ctx, w, h, state.caption, state.sub, grade);
}
