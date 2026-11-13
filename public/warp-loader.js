// Orbit "Warp" loader: green stars streaming out of the centre, drawn on a transparent canvas so it takes the app's own background.
// index.html uses WARP.block(text, size) wherever the app waits for the AI. One animation loop draws every canvas.warp on the page
// (the page redraws its HTML often, so the loop looks the canvases up on every frame) and stops by itself when none is left.
(function (g) {
  'use strict';
  const doc = g.document, TAU = 6.2832, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const still = g.matchMedia && g.matchMedia('(prefers-reduced-motion:reduce)').matches;
  // far star = almost the app background, close star = full green (light: #16a34a, dark: #4ade80)
  const COL = { light: { far: [205, 214, 200], near: [22, 163, 74] }, dark: { far: [40, 62, 46], near: [74, 222, 128] } };
  const isDark = () => { const t = doc.documentElement.dataset.theme; return t === 'dark' || (t !== 'light' && g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches); };
  let T = 0, last = 0, running = false;

  function paint(cv) {
    const dpr = g.devicePixelRatio || 1, S = cv.clientWidth || 48;
    if (cv.width !== Math.round(S * dpr)) cv.width = cv.height = Math.round(S * dpr);
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, S, S);
    const C = isDark() ? COL.dark : COL.light, cx = S / 2, cy = S / 2;
    const mix = l => { l = cl(l, 0, 1); return 'rgb(' + [0, 1, 2].map(i => Math.round(C.far[i] + (C.near[i] - C.far[i]) * l)).join(',') + ')'; };
    x.lineCap = 'round';
    for (let i = 0; i < 110; i++) {
      const ang = rnd(i) * TAU, rad = .05 + rnd(i + 300) * .95, z = ((rnd(i + 600) - T * .3 * (.6 + rnd(i + 900) * .8)) % 1 + 1) % 1;
      const f = q => rad * S * .07 / (q + .04), p1 = f(z), p2 = f(Math.min(1.3, z + .09));
      if (p1 > S * .5) continue;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      x.strokeStyle = mix(.25 + .75 * (1 - z)); x.globalAlpha = .35 + .65 * (1 - z); x.lineWidth = Math.max(1, S * .0035 * (1 + (1 - z) * 2));
      x.beginPath(); x.moveTo(cx + ca * p2, cy + sa * p2); x.lineTo(cx + ca * p1, cy + sa * p1); x.stroke();
    }
    x.globalAlpha = 1; x.fillStyle = mix(1); x.beginPath(); x.arc(cx, cy, Math.max(.8, S * .012 * (1 + .3 * Math.sin(T * 6))), 0, TAU); x.fill();
  }
  function frame(ts) {
    const list = doc.querySelectorAll('canvas.warp');
    if (!list.length) { running = false; return; }
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (!still) T += dt;
    list.forEach(paint); g.requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; g.requestAnimationFrame(frame); } }

  let css = false;
  function block(text, size) {   // HTML for "loader + text"; call it from the page's render code
    if (!css) { css = true; const s = doc.createElement('style'); s.textContent = '.think{display:flex;gap:12px;align-items:center;margin-top:12px}.think canvas{flex:none;display:block;background:transparent}.think b{font-weight:600}'; doc.head.appendChild(s); }
    const n = size || 40;
    g.setTimeout(start, 0);   // the canvas exists only after the page has put this HTML in
    return '<div class="think" role="status"><canvas class="warp" aria-hidden="true" style="width:' + n + 'px;height:' + n + 'px"></canvas><b>' + String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) + '</b></div>';
  }
  g.WARP = { block, start };
})(window);
