// svg-core.js - checks an AI-made SVG before it is kept or shown (Task 38). The app shows it only inside <img src="data:image/svg+xml">, where
// scripts never run; this check is a second lock and also keeps diagrams free of outside links. Pure, no network.
'use strict';

const MAX_LEN = 20000;
function cleanSvg(raw) {
  const m = String(raw || '').match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let svg = m[0];
  if (svg.length > MAX_LEN) return null;
  // scripting: tags, event handlers (also written as <svg/onload=...> or with quotes before them), javascript: and entity tricks
  if (/<\s*(script|foreignObject|iframe|image|embed|object|audio|video|link|meta)\b/i.test(svg)) return null;
  if (/[\s/"'`]on[a-z]+\s*=/i.test(svg) || /javascript\s*:|vbscript\s*:/i.test(svg) || /&#|&colon;|&Tab;|&NewLine;/i.test(svg)) return null;
  // outside links: any href (only #name inside the drawing is fine), or url(...) that is not #name
  const hrefs = svg.match(/(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi) || [];
  for (const h of hrefs) { const v = h.replace(/^[^=]*=\s*["']?/, '').replace(/["']$/, '').trim(); if (v[0] !== '#') return null; }
  const urls = svg.match(/url\(\s*([^)]*)\)/gi) || [];
  for (const u of urls) { const v = u.replace(/^url\(\s*["']?/i, '').replace(/["']?\s*\)$/, '').trim(); if (v[0] !== '#') return null; }
  if (/@import/i.test(svg)) return null;
  if (!/xmlns\s*=/.test(svg.slice(0, 200))) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}

module.exports = { cleanSvg, MAX_LEN };
