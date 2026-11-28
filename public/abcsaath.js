// public/abcsaath.js - Bolo "A–Z saath me bolo" (ABC saath me bolo): the teacher's recording says the 26 English letters, the child speaks along.
// It works exactly like Saath me bolo (public/saath.js) and Swar saath me bolo (public/swarsaath.js) and is kept apart from them: own file, own ids (abz...), own buttons (aauto / aautostop), own global ABCSAATH.
// The mic stays on from before the first letter to after the last (calibration, then the whole recording). Nothing is recognised: only the sound LEVEL
// is measured. A letter whose window had no sound is a red alert. The whole recording and the per-letter report go to the parent's phone
// (BOLOREC.send -> /api/bolo/rec/upload) and are deleted after 2 hours. Needs the mic switch on; the recording is sent only with a Kid-mode code and the parent's tick, otherwise it is practice only (checked by bolo.js).
// Below the big letter the picture word of the A se Z topic is shown ("A for Apple"), and it changes with the letter.
// bolo.js calls ABCSAATH.html({ ready, why, sens, practice }) for the card, ABCSAATH.start({ code, api, redraw, sens }) and ABCSAATH.stop().
(function (g) {
  'use strict';
  const K = g.ABCSAATH_CORE, BC = g.BOLOREC_CORE;
  if (!K || !BC) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => g.document.getElementById(id);
  const N = K.LETTERS.length;
  const word = i => K.LETTERS[i] + ' for ' + K.WORDS[i];
  const fresh = () => ({ phase: 'idle', cur: -1, cells: new Array(N).fill(0), voiced: new Array(N).fill(0), letters: [], miss: 0, sent: false, err: '', level: 0, end: null, cancel: false, mult: 1 });
  let S = fresh();   // phase: idle | calib | run | send | done. cells: 0 not yet, 1 sound came, 2 red alert

  function style() {
    if ($('abzSty')) return;
    const s = g.document.createElement('style'); s.id = 'abzSty';
    s.textContent = `.abz{background:var(--card);border-radius:22px;padding:16px;margin:12px 0;box-shadow:0 1px 0 var(--ln);text-align:center}
.abz-top{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:14px;color:var(--mut)}
.abz-bar{height:8px;border-radius:5px;background:rgba(127,127,127,.2);overflow:hidden;margin:10px 0}.abz-bar i{display:block;height:100%;width:0;background:#8e44ad;transition:width .3s}
.abz-big{font-size:84px;line-height:1.2;font-weight:700;min-height:100px;color:var(--tx)}
.abz-word{font-size:26px;font-weight:700;min-height:38px;margin:2px 0 8px;color:var(--mut)}
.abz-st{color:var(--mut);min-height:22px;margin:0;font-size:14px}
.abz-ms{min-height:20px;margin:6px 0 0;color:#d64545;font-weight:700;font-size:14px}
.abz-mt{position:relative;height:6px;border-radius:4px;background:rgba(127,127,127,.2);overflow:hidden;opacity:0;margin:8px 0}.abz-mt.on{opacity:1}.abz-mt i{display:block;height:100%;width:0;background:#1a9d5a}.abz-mt b{position:absolute;top:0;bottom:0;width:3px;background:currentColor;left:35%}
.abz-g{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px}
.abz-c{background:var(--ans);color:var(--tx);border-radius:10px;padding:6px 0;font-size:24px;font-weight:600;min-height:44px;display:flex;align-items:center;justify-content:center;border:2px solid transparent}
.abz-c.now{border-color:#8e44ad;background:#8e44ad;color:#fff;transform:scale(1.08)}
.abz-c.ok{background:rgba(26,157,90,.18);border-color:#1a9d5a}.abz-c.ok.now{background:#1a9d5a;border-color:#1a9d5a;color:#fff}.abz-c.no{background:rgba(214,69,69,.18);border-color:#d64545}.abz-c.e{visibility:hidden}
.abz-sum{font-size:15px;margin:12px 0 0;line-height:1.5}
@media(prefers-reduced-motion:reduce){.abz-c.now{transform:none}.abz-bar i{transition:none}}`;
    g.document.head.appendChild(s);
  }


  const redraw = () => { try { S.redraw && S.redraw(); } catch (e) {} };
  const statusText = () => S.phase === 'calib' ? 'Shaant raho...' : S.phase === 'run' ? 'Saath me bolo' : S.phase === 'done' ? (S.replay ? 'Shabash! 5 second mein phir shuru hoga.' : 'Shabash!') : 'Start dabao, phir letter ke saath bolte jao.';
  const missText = () => S.miss ? 'Red alert: awaaz nahi aayi: ' + S.miss + ' letter' : '';

  // The screen follows the state: bolo.js may redraw the whole page at any time, and the cells, letter and counters come back as they were.
  function html(o) {
    style(); o = o || {};
    const busy = S.phase === 'calib' || S.phase === 'run';
    const cur = S.cur >= 0 ? S.cur : 0, big = K.LETTERS[cur];   // before Start the first letter is shown, like Saath me bolo
    const grid = K.rows().map(r => r.map(k => k < 0 ? '<div class="abz-c e"></div>' : `<div class="abz-c${S.cells[k] === 1 ? ' ok' : S.cells[k] === 2 ? ' no' : ''}${S.cur === k && S.phase === 'run' ? ' now' : ''}" data-i="${k}" lang="en">${esc(K.LETTERS[k])}</div>`).join('')).join('');
    const bad = S.letters.filter(x => !x.s).map(x => x.l);
    const sum = S.phase === 'done' ? `<p class="abz-sum" role="status"><b>${S.letters.length - bad.length} / ${N}</b> letters par awaaz aayi.<br>${bad.length ? `<span style="color:#d64545">Awaaz nahi aayi: <span lang="en">${esc(bad.join(' '))}</span></span>` : 'Har letter par bachha bola.'}<br><span class="mut">Recording kisi ko nahi bheji jaati: sirf awaaz ka level naapa jaata hai.</span></p>` : '';
    const err = S.err ? `<p class="err" role="alert" style="margin:8px 0 0">${esc(S.err)}</p>` : '';
    const stopBtn = '<div class="bl-two" style="margin-top:10px"><button class="btn bl-sec" data-bl="aautostop">Rok do</button></div>';
    const btn = S.replay ? stopBtn : busy ? stopBtn
      : o.ready ? `<div class="bl-two" style="margin-top:10px"><button class="btn" data-bl="aauto">${S.phase === 'done' ? 'Phir se' : 'Saath me bolo (shuru)'}</button></div>`
        : `<p class="mut" style="margin:10px 0 0">${esc(o.why || '')}</p>`;
    return `<div class="abz"><div class="abz-top"><span>A se Z saath me bolo · English letters</span><span id="abzCnt">${S.letters.length} / ${N}</span></div>
      <div class="abz-bar"><i id="abzPr" style="width:${Math.round(S.letters.length / N * 100)}%"></i></div>
      <div class="abz-big" id="abzBig" lang="en">${esc(big)}</div>
      <div class="abz-word" id="abzWord" lang="en">${esc(word(cur))}</div>
      <p class="abz-st" id="abzSt" role="status">${statusText()}</p><div class="abz-ms" id="abzMs" role="alert">${esc(missText())}</div>
      <div class="abz-mt${busy ? ' on' : ''}" id="abzMtw"><i id="abzMt"></i><b id="abzMk" style="left:${Math.min(98, 35 * (busy ? S.mult : K.mult(o.sens))).toFixed(1)}%" title="Is line ke upar awaaz aaye to green"></b></div>
      <div class="abz-g" id="abzGrid">${grid}</div>${sum}${err}${btn}</div>`;
  }

  // Live changes go straight into the page (no full redraw while the child is speaking).
  function paint() {
    const c = $('abzCnt'); if (c) c.textContent = S.letters.length + ' / ' + N;
    const p = $('abzPr'); if (p) p.style.width = Math.round(S.letters.length / N * 100) + '%';
    if (S.cur >= 0) {   // the letter and its word change together
      const b = $('abzBig'); if (b) b.textContent = K.LETTERS[S.cur];
      const w = $('abzWord'); if (w) w.textContent = word(S.cur);
    }
    const st = $('abzSt'); if (st) st.textContent = statusText();
    const ms = $('abzMs'); if (ms) ms.textContent = missText();
    g.document.querySelectorAll('#abzGrid .abz-c[data-i]').forEach(el => {
      const k = +el.dataset.i; el.classList.toggle('now', S.phase === 'run' && S.cur === k); el.classList.toggle('ok', S.cells[k] === 1); el.classList.toggle('no', S.cells[k] === 2);
    });
  }

  function judge(k, off) {
    if (k < 0 || S.cells[k]) return;
    const ok = S.voiced[k] >= K.SPOKE_MS;
    S.cells[k] = ok ? 1 : 2; if (!ok) S.miss++;
    S.letters.push({ i: k, l: K.LETTERS[k], t: K.startMs(off, k), s: ok ? 1 : 0 });   // t: where this letter starts inside the child's recording, so the parent can jump there
  }

  // o = { code, api, redraw, calibMs, tailMs }
  let replayT = 0;
  async function start(o) {
    o = o || {};
    if (replayT) { clearTimeout(replayT); replayT = 0; }
    if (S.phase !== 'idle' && S.phase !== 'done') return;
    S = fresh(); S.mult = K.mult(o.sens); S.redraw = o.redraw || (() => { if (typeof g.draw === 'function') g.draw(); }); S.phase = 'calib'; redraw();
    let stream = null, ctx = null, rec = null, au = null, tmr = 0, level = () => 0;
    const chunks = [];
    try { stream = await g.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } }); }
    catch (e) { S.err = 'Mic ki ijazat nahi mili.'; S.phase = 'idle'; redraw(); return; }
    let natural = false, off = 0;
    try {
      ctx = new (g.AudioContext || g.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 1024; const buf = new Float32Array(an.fftSize);
      ctx.createMediaStreamSource(stream).connect(an);   // only for measuring: never connected to the speaker; the teacher audio is never connected to the recorder
      level = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let k = 0; k < buf.length; k++) s += buf[k] * buf[k]; return Math.sqrt(s / buf.length); };
      try { rec = new g.MediaRecorder(stream, { audioBitsPerSecond: 24000 }); } catch (e) { rec = new g.MediaRecorder(stream); }
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(r => { rec.onstop = r; });
      rec.start(1000); const t0 = Date.now();
      let peak = 0; const cal = [], c0 = Date.now(), calib = o.calibMs == null ? 1000 : o.calibMs;
      while (Date.now() - c0 < calib && !S.cancel) { cal.push(level()); await sleep(30); }   peak = BC.ambient(cal);   // 1 s of quiet: the room's own noise sets the level that counts as a voice
      const base = BC.threshold(peak, 0.015), thr = base * S.mult;   // base: the room's level x 2.5; the parent's slider scales it (x1 at the middle)
      if (!S.cancel) {
        au = new g.Audio(K.SRC);
        const done = new Promise(r => { S.end = r; au.onended = () => { natural = true; r(); }; au.onerror = () => r(); });
        au.onplaying = () => { if (!off) off = (Date.now() - t0) / 1000 - au.currentTime; };
        await au.play(); if (!off) off = (Date.now() - t0) / 1000 - au.currentTime;
        S.phase = 'run'; redraw();
        let last = Date.now();
        tmr = setInterval(() => {
          const t = au.currentTime, n = Date.now(), dt = n - last, l = level(); last = n;
          const i = K.letterAt(t);
          if (i !== S.cur) { judge(S.cur, off); S.cur = i; paint(); }   // the letter before is decided when the next one begins
          const m = $('abzMt'); if (m) m.style.width = Math.min(100, l / base * 35) + '%';
          if (i >= 0 && t < K.win(i)[1] && l > thr) S.voiced[i] += dt;
          if (i >= 0 && !S.cells[i] && S.voiced[i] >= K.SPOKE_MS) { judge(i, off); paint(); }   // green the moment enough sound has come, not only when the letter is over
        }, 40);
        await done; clearInterval(tmr); tmr = 0;
        if (natural) { judge(S.cur, off); await sleep(o.tailMs == null ? 800 : o.tailMs); }   // the last letter, then a short tail so its end is in the recording
        try { au.pause(); } catch (e) {}
      }
      if (rec.state !== 'inactive') rec.stop(); await stopped;
    } catch (e) { S.err = 'Recording mein dikkat aayi.'; }
    clearInterval(tmr); try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} try { ctx && ctx.close(); } catch (e) {}
    chunks.length = 0;   // the recording is NOT sent to anyone: only the sound level was measured
    S.cur = -1; S.phase = S.letters.length ? 'done' : 'idle'; S.end = null; redraw();
    // Auto replay: after a full natural run the lesson starts again 5 seconds later (Rok do / leaving the screen cancels it).
    if (natural && !S.cancel && !S.err && S.letters.length && o.replayMs !== 0) {
      S.replay = true; redraw();
      replayT = setTimeout(() => { replayT = 0; S.replay = false; if (!o.alive || o.alive()) start(o); else redraw(); }, o.replayMs == null ? 5000 : o.replayMs);
    }
  }

  // Rok do / the child left the screen: nothing is sent anywhere.
  function stop() { if (replayT) { clearTimeout(replayT); replayT = 0; S.replay = false; redraw(); } S.cancel = true; if (S.end) S.end(); }
  g.ABCSAATH = { html, start, stop, running: () => S.phase === 'calib' || S.phase === 'run', _state: () => S, _reset: () => { S = fresh(); } };
})(typeof window !== 'undefined' ? window : globalThis);
