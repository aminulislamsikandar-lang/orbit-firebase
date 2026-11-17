// public/byanjan-video.js - the small "video" in Bolo's Assamese byanjan mode: a side view of the mouth that shows WHERE the sound is made
// (tongue, lips, nose, throat) while the recorded voice plays. Pure SVG + requestAnimationFrame, no files, no network.
// bolo.js calls BYANJAN_VIDEO.stageHTML(item) to draw it and BYANJAN_VIDEO.play(item, {lead, ms}) / stop().
// The animation looks its elements up by id on every frame, so a redraw of the Bolo screen in the middle of a clip does not break it.
(function () {
  'use strict';
  const g = window;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => g.document.getElementById(id);

  // Tongue outlines: 12 points each (same count so one can slide into the other). Face looks left, lips at the left.
  const REST = [[204, 150], [222, 141], [246, 137], [272, 136], [298, 142], [316, 156], [324, 180], [318, 204], [290, 206], [256, 198], [224, 186], [207, 168]];
  const SHAPES = {
    velar:     [[202, 160], [220, 156], [244, 150], [270, 128], [297, 99], [314, 108], [322, 150], [318, 200], [290, 206], [256, 200], [224, 190], [206, 174]],
    palatal:   [[204, 156], [222, 140], [236, 106], [252, 87], [274, 87], [298, 120], [320, 160], [318, 204], [290, 206], [256, 200], [224, 190], [207, 172]],
    retroflex: [[216, 92], [236, 112], [256, 124], [276, 130], [298, 140], [316, 156], [324, 182], [318, 204], [290, 206], [258, 196], [232, 172], [214, 120]],
    dental:    [[203, 112], [222, 128], [246, 134], [272, 136], [298, 142], [316, 156], [324, 180], [318, 204], [290, 206], [256, 198], [224, 184], [208, 150]]
  };
  const CONTACT = { velar: [298, 96], palatal: [262, 82], retroflex: [221, 88], dental: [200, 112] };
  const VEL_UP = [304, 92, 322, 100, 332, 108], VEL_DOWN = [306, 100, 318, 120, 321, 138];   // soft palate: raised (nose closed) / lowered (air goes through the nose)

  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpPts = (a, b, t) => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
  function smooth(pts) {   // closed smooth curve through the points (Catmull-Rom as cubic Beziers)
    const n = pts.length, f = v => Math.round(v * 10) / 10;
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + 'Z';
  }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), ease = t => t * t * (3 - 2 * t);
  const reduced = () => { try { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

  const target = it => SHAPES[it.place] || REST;
  const pose = it => ({ place: it.place, labial: it.place === 'labial', nasal: !!it.nasal || it.place === 'none', throat: it.place === 'throat' });

  function style() {
    if (g.document.getElementById('bvStyle')) return;
    const s = g.document.createElement('style'); s.id = 'bvStyle';
    s.textContent = `.bv-stage{display:grid;grid-template-columns:34% 1fr;gap:10px;align-items:stretch;margin:12px 0 4px}
.bv-glyph{position:relative;display:grid;place-items:center;border-radius:18px;background:var(--ans);color:var(--tx);font-weight:700;font-size:84px;line-height:1;min-height:150px;font-family:'Noto Sans Bengali','Nirmala UI','Vrinda','Shonar Bangla','Bangla MN',system-ui,sans-serif}
.bv-glyph span{padding-bottom:16px}.bv-eq{position:absolute;left:50%;bottom:10px;width:46px;height:16px;margin-left:-23px}.bv-eq rect{fill:var(--on)}
.bv-mouth{width:100%;height:auto;display:block;background:var(--ans);border-radius:18px}
.bv-line{fill:none;stroke:var(--tx);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:.7}
.bv-tongue{fill:#e58a9a;stroke:#b4506a;stroke-width:2;stroke-linejoin:round}.bv-lip{fill:#d9697f;stroke:#a84560;stroke-width:2}.bv-teeth{fill:#fff;stroke:#8a8f99;stroke-width:1.5}
.bv-note{margin:6px 2px 0;font-size:13.5px;color:var(--mut);text-align:center}.bv-note b{font-family:'Noto Sans Bengali','Nirmala UI','Vrinda',system-ui,sans-serif;color:var(--tx)}`;
    g.document.head.appendChild(s);
  }

  // One frame. p: how far the mouth has moved (0 rest, 1 sound position), t: ms since the clip started, eq: sound bars on/off, pulse: glyph pop (0..1)
  function apply(it, p, t, eq, pulse) {
    const P = pose(it), tg = $('bvTongue'); if (!tg) return;
    tg.setAttribute('d', smooth(lerpPts(REST, target(it), p)));
    const dy = P.labial ? 16 * p : 0;
    $('bvUL').setAttribute('transform', 'translate(0 ' + dy + ')'); $('bvLL').setAttribute('transform', 'translate(0 ' + -dy + ')');
    const c = CONTACT[it.place], ct = $('bvContact');
    if (c) { ct.setAttribute('cx', c[0]); ct.setAttribute('cy', c[1]); ct.setAttribute('opacity', clamp((p - 0.8) / 0.2, 0, 1)); } else ct.setAttribute('opacity', P.labial ? clamp((p - 0.8) / 0.2, 0, 1) : 0);
    if (P.labial) { ct.setAttribute('cx', 168); ct.setAttribute('cy', 123); }
    const nz = P.nasal ? p : 0;
    $('bvVelum').setAttribute('d', 'M290 86C' + lerpPts([VEL_UP.slice(0, 2), VEL_UP.slice(2, 4), VEL_UP.slice(4)], [VEL_DOWN.slice(0, 2), VEL_DOWN.slice(2, 4), VEL_DOWN.slice(4)], nz).map(q => Math.round(q[0]) + ' ' + Math.round(q[1])).join(' '));
    const nas = $('bvNasal'); nas.setAttribute('opacity', nz * 0.9); nas.setAttribute('stroke-dashoffset', String(-(t / 25) % 17));
    $('bvThroat').setAttribute('opacity', P.throat ? p * (0.55 + 0.45 * Math.sin(t / 90)) : 0);
    const gl = $('bvGlyph'); if (gl) gl.style.transform = 'scale(' + (1 + 0.07 * pulse) + ')';
    for (let i = 0; i < 5; i++) { const b = $('bvB' + i); if (b) { const h = eq ? 4 + 12 * Math.abs(Math.sin(t / 110 + i * 1.3)) : 4; b.setAttribute('y', 16 - h); b.setAttribute('height', h); } }
  }

  let raf = 0;
  function stop(it) { if (raf) g.cancelAnimationFrame(raf); raf = 0; if (it) apply(it, 1, 0, false, 0); }
  // lead: ms the mouth moves before the voice starts. ms: length of the recorded clip.
  function play(it, o) {
    stop();
    o = o || {}; const lead = o.lead == null ? 350 : o.lead, ms = o.ms || it.ms || 900, total = lead + ms + 250 + 450;
    if (reduced() || !g.requestAnimationFrame) { apply(it, 1, 0, false, 0); return; }
    const t0 = g.performance.now();
    const frame = now => {
      const t = now - t0, out = lead + ms + 250;
      const p = Math.min(ease(clamp(t / 500, 0, 1)), 1 - ease(clamp((t - out) / 450, 0, 1)));
      const eq = t > lead + 120 && t < lead + ms - 150, pulse = t > lead && t < lead + 300 ? Math.sin((t - lead) / 300 * Math.PI) : 0;
      apply(it, p, t, eq, pulse);
      if (t < total) raf = g.requestAnimationFrame(frame); else { raf = 0; apply(it, 1, 0, false, 0); }
    };
    raf = g.requestAnimationFrame(frame);
  }

  function stageHTML(it, P) {
    style();
    const pz = pose(it), poster = lerpPts(REST, target(it), 1), cn = CONTACT[it.place], lab = pz.labial, dy = lab ? 16 : 0, nz = pz.nasal ? 1 : 0;
    const vel = lerpPts([VEL_UP.slice(0, 2), VEL_UP.slice(2, 4), VEL_UP.slice(4)], [VEL_DOWN.slice(0, 2), VEL_DOWN.slice(2, 4), VEL_DOWN.slice(4)], nz).map(q => Math.round(q[0]) + ' ' + Math.round(q[1])).join(' ');
    const bars = [0, 1, 2, 3, 4].map(i => `<rect id="bvB${i}" x="${i * 9}" y="12" width="6" height="4" rx="2"/>`).join('');
    const note = P && P[it.place] ? `<b>${esc(P[it.place].as)}</b>: ${esc(P[it.place].hint)}${pz.nasal && it.place !== 'none' ? ' Saath mein hawa naak se bhi jati hai.' : ''}` : '';
    return `<div class="bv-stage"><div class="bv-glyph" id="bvGlyph" lang="as"><span>${esc(it.big)}</span><svg class="bv-eq" viewBox="0 0 42 16" aria-hidden="true">${bars}</svg></div>
<svg class="bv-mouth" viewBox="150 50 200 195" role="img" aria-label="Mukh ka side-view: ${esc(P && P[it.place] ? P[it.place].hint : '')}">
<path id="bvNasal" d="M172 72C200 58 260 54 300 66C324 74 332 90 332 108" fill="none" stroke="#4a90d9" stroke-width="12" stroke-linecap="round" stroke-dasharray="3 14" opacity="${nz * 0.9}"/>
<ellipse id="bvThroat" cx="337" cy="190" rx="9" ry="14" fill="#f5a623" opacity="${pz.throat ? 0.8 : 0}"/>
<path class="bv-line" d="M200 100C205 90 215 82 235 80C255 76 275 78 290 86"/>
<path id="bvVelum" class="bv-line" d="M290 86C${vel}"/>
<path class="bv-line" d="M332 108C336 135 336 190 340 232"/>
<path id="bvTongue" class="bv-tongue" d="${smooth(poster)}"/>
<rect class="bv-teeth" x="190" y="100" width="10" height="22" rx="3"/><rect class="bv-teeth" x="190" y="128" width="10" height="22" rx="3"/>
<path id="bvUL" class="bv-lip" transform="translate(0 ${dy})" d="M168 84C158 90 158 100 168 106L190 104L190 88Z"/>
<g id="bvLL" transform="translate(0 ${-dy})"><path class="bv-line" d="M168 162C166 188 180 206 205 214L236 238"/><path class="bv-lip" d="M168 140C158 146 158 156 170 162L190 160L190 142Z"/></g>
<circle id="bvContact" r="7" fill="#f5a623" stroke="#fff" stroke-width="1.5" cx="${lab ? 168 : cn ? cn[0] : 0}" cy="${lab ? 123 : cn ? cn[1] : 0}" opacity="${cn || lab ? 1 : 0}"/>
</svg></div><p class="bv-note">${note}</p>`;
  }

  g.BYANJAN_VIDEO = { stageHTML, play, stop, _smooth: smooth, SHAPES, REST };
})();
