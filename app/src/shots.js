// Fixed scenes for screenshots. Query parameters:
//   ?shot=cover  the cover alone, full viewport (the controls are hidden)
//   ?shot=editor the editor with photos loaded
//   photo, photo2, photo3  sample names for the three panels (pier, boulevard)
//   caption, sub           the words on the cover
//   layout                 hero-left, hero-top or triptych
//   grade                  sunset, neon or dusk
//   size                   square, portrait or wide
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, app) {
  const { state, setPhoto, loadImage, captionInput, subInput, fillAllInput, redraw } = app;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  state.size = query.get('size') || state.size;
  state.fillAll = false;
  fillAllInput.checked = false;
  state.caption = query.get('caption') || state.caption;
  state.sub = query.get('sub') || state.sub;
  captionInput.value = state.caption;
  subInput.value = state.sub;
  document.querySelectorAll('input[name="layout"]').forEach((r) => { r.checked = r.value === state.layout; });
  document.querySelectorAll('input[name="grade"]').forEach((r) => { r.checked = r.value === state.grade; });
  document.querySelectorAll('input[name="size"]').forEach((r) => { r.checked = r.value === state.size; });
  document.getElementById('cover').className = `size-${state.size}`;
  const names = [query.get('photo') || 'boulevard', query.get('photo2') || 'pier', query.get('photo3') || 'boulevard'];
  for (let i = 0; i < 3; i++) {
    const img = await loadImage(`samples/${names[i]}.jpg`);
    state.photos[i] = { img, zoom: 1, ox: 0, oy: 0 };
  }
  state.selected = 0;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
