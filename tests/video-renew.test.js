/* Tests for the silent video-link renewal (vidFail in public/index.html) and the configurable link lifetime (server.js).
 * The real vidFail text is cut out of index.html and run with fakes. Run: node tests/video-renew.test.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8').replace(/\r\n/g, '\n'), srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').replace(/\r\n/g, '\n');
const a = html.indexOf('function vidGiveUp'), b = html.indexOf('// JSON ("plan") and HTML videos added from the admin menu');
if (a < 0 || b < 0 || b < a) { console.log('FAIL  could not find vidGiveUp / vidFail in index.html'); process.exit(1); }
const code = html.slice(a, b);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function world({ el, apiImpl }) {
  const w = { VID: { v1: { url: 'https://b2/old?sig=1', renewed: false } }, draws: 0, apiCalls: [], selectors: [] };
  const document = { querySelector: sel => { w.selectors.push(sel); return el; } };
  const api = async (p, body) => { w.apiCalls.push([p, body]); return apiImpl(); };
  const fn = new Function('VID', 'document', 'api', 'draw', code + '\nreturn { vidFail, vidGiveUp };')(w.VID, document, api, () => { w.draws++; });
  return Object.assign(w, fn);
}
const fakeEl = (over = {}) => { const el = { currentTime: 42, paused: false, loads: 0, src: 'old', handlers: {}, played: 0, addEventListener(n, f) { this.handlers[n] = f; }, load() { this.loads++; }, play() { this.played++; return Promise.resolve(); }, ...over }; return el; };

(async () => {
  { const el = fakeEl(), w = world({ el, apiImpl: async () => ({ url: 'https://b2/new?sig=2' }) });
    w.vidFail('v1'); await sleep(5);
    t('first failure: ONE call for a new link, same <video>, new src, reloaded, NO redraw', w.apiCalls.length === 1 && w.apiCalls[0][0] === '/api/video' && w.apiCalls[0][1].id === 'v1' && el.src === 'https://b2/new?sig=2' && el.loads === 1 && w.draws === 0);
    t('...the stored link is replaced and the error message is not shown', w.VID.v1.url === 'https://b2/new?sig=2' && !w.VID.v1.err);
    el.currentTime = 0; el.handlers.loadedmetadata();
    t('...after the new link loads: position restored and it resumes because it was playing', el.currentTime === 42 && el.played === 1);
    t('...once playing again, a later expiry can be renewed again', w.VID.v1.renewed === true && (el.handlers.playing(), w.VID.v1.renewed === false)); }
  { const el = fakeEl({ paused: true }), w = world({ el, apiImpl: async () => ({ url: 'https://b2/new' }) });
    w.vidFail('v1'); await sleep(5); el.currentTime = 0; el.handlers.loadedmetadata();
    t('a video the student had paused is NOT started by the renewal, but keeps its position', el.played === 0 && el.currentTime === 42); }
  { const el = fakeEl(), w = world({ el, apiImpl: async () => ({ url: 'https://b2/new' }) });
    w.vidFail('v1'); await sleep(5); w.vidFail('v1');
    t('a second failure right after the renewal -> the old message and url removed (no endless retry)', w.VID.v1.url === undefined && /Video chal nahi paayi/.test(w.VID.v1.err) && w.draws === 1 && w.apiCalls.length === 1); }
  { const el = fakeEl(), w = world({ el, apiImpl: async () => { throw new Error('subscription_required'); } });
    w.vidFail('v1'); await sleep(5);
    t('the server refuses a new link (e.g. no subscription any more) -> the normal message', w.VID.v1.url === undefined && /Video chal nahi paayi/.test(w.VID.v1.err) && w.draws === 1 && el.loads === 0); }
  { const el = fakeEl(), w = world({ el, apiImpl: async () => ({}) });
    w.vidFail('v1'); await sleep(5);
    t('an answer without a url -> the normal message', w.VID.v1.url === undefined && w.draws === 1); }
  { const w = world({ el: null, apiImpl: async () => ({ url: 'x' }) });
    w.vidFail('v1'); await sleep(5);
    t('no <video> on the page any more -> old behaviour, no request', w.apiCalls.length === 0 && w.VID.v1.url === undefined && w.draws === 1); }
  { const w = world({ el: fakeEl(), apiImpl: async () => ({ url: 'x' }) }); w.VID.v1.url = undefined; w.vidFail('v1'); await sleep(5);
    t('a video that was already closed (no url) is not renewed', w.apiCalls.length === 0); }
  { const w = world({ el: fakeEl(), apiImpl: async () => ({ url: 'x' }) }); w.vidFail('nope'); t('unknown id -> nothing happens', w.apiCalls.length === 0 && w.draws === 0); }
  { const w = world({ el: fakeEl(), apiImpl: async () => ({ url: 'x' }) }); w.VID['a"] , body{'] = { url: 'u' }; w.vidFail('a"] , body{'); await sleep(2);
    t('an id with quotes cannot break out of the selector', w.selectors.length === 1 && w.selectors[0] === 'video[data-vo="a] , body{"]'); }

  t('openVideo resets the renewal flag when a new link is fetched', /s\.url=j\.url;s\.renewed=false/.test(html));
  t('both <video> templates still call vidFail on error', (html.match(/onerror="vidFail\('\$\{esc\(v\.id\)\}'\)"/g) || []).length === 2);
  t('server: VIDEO_URL_TTL is read (default 3600, between 60 and 7200 seconds) and used for the video link', /const VIDEO_TTL = Math\.min\(7200, Math\.max\(60, parseInt\(process\.env\.VIDEO_URL_TTL \|\| '3600', 10\) \|\| 3600\)\)/.test(srv) && /Key: v\.key \}\), \{ expiresIn: VIDEO_TTL \}/.test(srv));
  t('server: narration links are capped at 2 hours (was 24)', /const NARR_TTL = Math\.min\(7200, Math\.max\(60,/.test(srv) && !/Math\.min\(86400/.test(srv));
  const clamp = v => Math.min(7200, Math.max(60, parseInt(v || '3600', 10) || 3600));
  t('lifetime clamp: unset 3600, 900 stays, 10 -> 60, 999999 -> 7200, junk -> 3600', clamp(undefined) === 3600 && clamp('900') === 900 && clamp('10') === 60 && clamp('999999') === 7200 && clamp('abc') === 3600);
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
