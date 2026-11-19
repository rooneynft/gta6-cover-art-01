// Wires the page: pick photos for the three panels, type the caption, choose a
// layout, grade and post size, drag a photo to move it, and export the cover as
// a PNG. A `?shot=` query sets up a fixed scene for a screenshot instead
// (./shots.js): ?shot=cover draws the cover alone, ?shot=editor the editor.
import { drawCover, layoutPanels, panelAt, panBounds, SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');
const zoomInput = document.getElementById('zoom');
const zoomLabel = document.getElementById('zoom-label');
const fillAllInput = document.getElementById('fill-all');

const state = {
  size: 'square',
  layout: 'hero-left',
  grade: 'sunset',
  caption: 'Sunset Heist',
  sub: 'One last job on the boulevard',
  photos: [null, null, null],
  selected: 0,
  fillAll: true,
};

function redraw() {
  drawCover(canvas, state);
  const photo = state.photos[state.selected];
  zoomInput.disabled = !photo;
  zoomInput.value = photo ? String(photo.zoom || 1) : '1';
  zoomLabel.textContent = photo ? `${Math.round((photo.zoom || 1) * 100)}%` : 'no photo yet';
  document.querySelectorAll('.panel-row').forEach((row, i) => {
    row.classList.toggle('selected', i === state.selected);
  });
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Puts a photo into one panel (and, when fill-all is on, into every panel). */
function setPhoto(index, img) {
  const slot = { img, zoom: 1, ox: 0, oy: 0 };
  if (state.fillAll) {
    state.photos = state.photos.map((old, i) => (old && old.img === img ? old : { img, zoom: 1, ox: 0, oy: 0 }));
    state.photos[index] = slot;
  } else {
    state.photos[index] = slot;
  }
  state.selected = index;
  redraw();
}

// One file picker, one sample pair and one zoom slider per panel.
document.querySelectorAll('.panel-row').forEach((row) => {
  const index = Number(row.dataset.panel);
  row.querySelector('.photo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(index, await loadImage(URL.createObjectURL(file)));
    status.textContent = `Panel ${index + 1}: ${file.name}`;
  });
  row.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      setPhoto(index, await loadImage(`samples/${button.dataset.sample}.jpg`));
      status.textContent = `Panel ${index + 1}: sample ${button.dataset.sample}`;
    });
  });
  row.addEventListener('click', (e) => {
    if (e.target.closest('input, button')) return;
    state.selected = index;
    redraw();
  });
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.sub = subInput.value; redraw(); });

zoomInput.addEventListener('input', () => {
  const photo = state.photos[state.selected];
  if (!photo) return;
  photo.zoom = Number(zoomInput.value);
  redraw();
});

fillAllInput.addEventListener('change', () => {
  state.fillAll = fillAllInput.checked;
  status.textContent = state.fillAll
    ? 'One photo fills all three panels'
    : 'Each panel takes its own photo';
});

// Layout, grade and size pickers: one radio group each.
document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => { state.layout = radio.value; redraw(); });
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => { state.grade = radio.value; redraw(); });
});
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    canvas.className = `size-${state.size}`;
    redraw();
  });
});

// Drag a photo inside its panel to move it; a click selects the panel.
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.size, state.layout, p.x, p.y);
  if (hit === -1) return;
  state.selected = hit;
  const photo = state.photos[hit];
  drag = { panel: hit, x: p.x, y: p.y, ox: photo ? photo.ox : 0, oy: photo ? photo.oy : 0, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const photo = state.photos[drag.panel];
  if (!photo) return;
  const dx = p.x - drag.x;
  const dy = p.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  // Clamp the pan so the photo always covers its panel.
  const panels = layoutPanels(state.size, state.layout);
  const bounds = panBounds(panels[drag.panel], photo);
  photo.ox = Math.max(bounds.minX, Math.min(bounds.maxX, drag.ox + dx));
  photo.oy = Math.max(bounds.minY, Math.min(bounds.maxY, drag.oy + dy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

document.getElementById('export').addEventListener('click', () => {
  redraw();
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed in this browser'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Screenshot scenes, or the plain editor.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, setPhoto, loadImage, captionInput, subInput, fillAllInput, redraw });
} else {
  redraw();
}
