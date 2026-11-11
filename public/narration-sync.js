/* narration-sync.js - audio-clock scheduler for narration-synchronised visuals (no DOM, works in the browser and in Node).
 *
 * The audio element's currentTime is the ONLY clock. Nothing here uses fixed delays or its own loop:
 *   sync(t)   is called from the audio's timeupdate / seeked / ended events and from ONE wake-up timer aimed at nextAt(t).
 *   Normal playback: events whose start has passed are started (animated), events whose end has passed are ended.
 *   Seek (backwards, a big jump, or restore:true): everything is reset and the state at time t is rebuilt instantly, in order,
 *   so the pen / dots / sprites look exactly as they would have at that moment.
 *
 * An event is { start, end?, kind:"cue"|"sprite", cue?:index, target?:id, action? }.  No end = stays until the step is left.
 */
(function (g) {
  "use strict";
  var ACTIONS = ["enter", "appear", "appear-and-flap", "appear-and-sway", "flap", "sway", "highlight", "exit"];
  var MAX_EVENTS = 30, JUMP = 1.5;

  function num(x) { return typeof x === "number" && isFinite(x); }

  function stateAt(ev, t) {
    if (t < ev.start) return "idle";
    if (ev.end == null || t < ev.end) return "active";
    return "done";
  }

  /* h = { reset(), start(ev, instant), end(ev, instant) } */
  function createScheduler(events, h) {
    var list = events.slice(), states = list.map(function () { return "idle"; }), last = 0;
    function rebuild(t) {
      h.reset();
      for (var i = 0; i < list.length; i++) {
        var want = stateAt(list[i], t);
        states[i] = "idle";
        if (want === "idle") continue;
        h.start(list[i], true); states[i] = "active";
        if (want === "done") { h.end(list[i], true); states[i] = "done"; }
      }
    }
    function sync(t, opts) {
      if (!num(t) || t < 0) t = 0;
      if ((opts && opts.restore) || t < last - 0.05 || t - last > JUMP) { rebuild(t); last = t; return; }
      for (var i = 0; i < list.length; i++) {
        var ev = list[i];
        if (states[i] === "idle" && t >= ev.start) { h.start(ev, false); states[i] = "active"; }
        if (states[i] === "active" && ev.end != null && t >= ev.end) { h.end(ev, false); states[i] = "done"; }
      }
      last = t;
    }
    function reset() { h.reset(); for (var i = 0; i < states.length; i++) states[i] = "idle"; last = 0; }
    function nextAt(t) {                         // the next moment something changes, or null
      var best = null;
      for (var i = 0; i < list.length; i++) {
        var ev = list[i], c = null;
        if (states[i] === "idle" && ev.start > t) c = ev.start;
        else if (states[i] === "idle") c = t;    // due now
        else if (states[i] === "active" && ev.end != null && ev.end > t) c = ev.end;
        if (c !== null && (best === null || c < best)) best = c;
      }
      return best;
    }
    return { sync: sync, reset: reset, nextAt: nextAt, count: list.length };
  }

  /* Cue times when the admin has not set them: spread over the real audio length (the old player spread them over an estimate). */
  function autoStarts(count, duration) {
    var out = [], d = num(duration) && duration > 0 ? duration : count * 2 + 1.5;
    var gap = Math.min(3, Math.max(0.4, (d * 0.9 - 0.5) / Math.max(count, 1)));
    for (var k = 0; k < count; k++) out.push(Math.round((0.5 + k * gap) * 100) / 100);
    return out;
  }

  /* seg.events (admin-set, optional) + the step's own cues -> ordered scheduler events.
   * Cue i is timed by {cue:i,start,end?}; if the admin set nothing for it, it gets an automatic time.
   * Sprite events need {target:id, action} and a scene id that exists; unknown ones are skipped and reported in .skipped. */
  function buildEvents(seg, cueCount, sceneIds, duration) {
    var raw = (seg && Array.isArray(seg.events)) ? seg.events : [], out = [], skipped = [], timed = {};
    var D = num(duration) && duration > 0 ? duration : null;
    function clamp(ev) {
      if (D !== null && ev.start > D) ev.start = Math.max(0, D - 0.2);
      if (ev.end != null) { if (D !== null && ev.end > D) ev.end = D; if (ev.end <= ev.start) ev.end = null; }
      return ev;
    }
    raw.forEach(function (e, n) {
      if (!e || typeof e !== "object" || !num(e.start) || e.start < 0) { skipped.push(n); return; }
      var end = num(e.end) ? e.end : null;
      if (typeof e.cue === "number" && Number.isInteger(e.cue) && e.cue >= 0 && e.cue < cueCount) {
        if (timed[e.cue] === undefined) { timed[e.cue] = true; out.push(clamp({ start: e.start, end: end, kind: "cue", cue: e.cue, order: e.cue })); } else skipped.push(n);
      } else if (typeof e.target === "string" && sceneIds.indexOf(e.target) >= 0 && ACTIONS.indexOf(e.action) >= 0) {
        out.push(clamp({ start: e.start, end: end, kind: "sprite", target: e.target, action: e.action, order: 1000 + n }));
      } else skipped.push(n);
    });
    var auto = autoStarts(cueCount, D);
    for (var i = 0; i < cueCount; i++) if (timed[i] === undefined) out.push({ start: auto[i], end: null, kind: "cue", cue: i, order: i });
    out.sort(function (a, b) { return a.start - b.start || a.order - b.order; });
    out.skipped = skipped;
    return out;
  }

  /* For the admin timing editor (Phase 5): returns a list of readable errors, empty = fine. */
  function validateEvents(events, cueCount, sceneIds, duration) {
    var errors = [];
    if (events === undefined) return errors;
    if (!Array.isArray(events)) return ["events: list chahiye"];
    if (events.length > MAX_EVENTS) errors.push("events: max " + MAX_EVENTS);
    events.forEach(function (e, i) {
      var p = "events[" + (i + 1) + "]";
      if (!e || typeof e !== "object") { errors.push(p + ": object chahiye"); return; }
      if (!num(e.start) || e.start < 0) errors.push(p + ".start: 0 ya usse bada number chahiye (seconds)");
      else if (num(duration) && duration > 0 && e.start > duration) errors.push(p + ".start: audio (" + duration + "s) se bada hai");
      if (e.end !== undefined && (!num(e.end) || e.end <= e.start)) errors.push(p + ".end: start se bada number chahiye");
      var isCue = e.cue !== undefined, isSprite = e.target !== undefined;
      if (isCue === isSprite) errors.push(p + ": ya cue (number) ya target+action chahiye");
      else if (isCue && !(Number.isInteger(e.cue) && e.cue >= 0 && e.cue < cueCount)) errors.push(p + ".cue: 0 se " + (cueCount - 1) + " ke beech ka number");
      else if (isSprite) {
        if (sceneIds.indexOf(e.target) < 0) errors.push(p + ".target: \"" + e.target + "\" is step ke scene me nahi hai");
        if (ACTIONS.indexOf(e.action) < 0) errors.push(p + ".action: " + ACTIONS.join(" / ") + " me se ek");
      }
    });
    return errors;
  }

  var api = { createScheduler: createScheduler, buildEvents: buildEvents, autoStarts: autoStarts, validateEvents: validateEvents, ACTIONS: ACTIONS, MAX_EVENTS: MAX_EVENTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.NarrationSync = api;
})(typeof window !== "undefined" ? window : globalThis);
