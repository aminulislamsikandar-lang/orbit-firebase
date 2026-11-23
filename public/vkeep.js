/* vkeep.js - one clean video experience.
 *
 * Problem: the app re-draws its HTML (the whole screen is rebuilt) for many reasons while a student watches. Every re-draw threw the playing
 * <video> away and built a new one: the picture froze or reset, the old element could keep its sound for a moment, the new one showed
 * a play button that did not match what was heard, and pressing play again gave two sounds.
 *
 * What this file does (it never changes the video file or the server):
 *   1. KEEP: when a re-draw replaces a <video data-vo=...> that was playing (or had progress) with a new <video> of the SAME id and the
 *      SAME src, the old element is put back in place of the new one. Playback continues without a break, same position, same buttons.
 *      (If the old one was paused by the browser while it was out of the page, it is started again.)
 *   2. ONE AT A TIME: when any video starts playing, every other video is paused, also ones that are no longer on the page.
 *   3. NO GHOSTS: a video that was removed from the page for good (closed, other chapter, new link) is paused at once.
 *
 * Load this BEFORE vboost.js. window.VKeep.state() lists every <video> (for debugging on a phone: paste it in the Console).
 */
(function (g) {
  "use strict";

  /* ---------- pure logic (tested in Node) ---------- */
  // gone / fresh: [{ id, src, keep, idle }]. Returns [[goneIndex, freshIndex], ...]: each old video is reused at most once, only for a
  // new one that has the same id and src and has not started yet (idle), and only if the old one is worth keeping.
  function pairVideos(gone, fresh) {
    var used = {}, out = [];
    fresh.forEach(function (f, fi) {
      if (!f.idle) return;
      for (var gi = 0; gi < gone.length; gi++) {
        var o = gone[gi];
        if (!used[gi] && o.keep && o.id && o.id === f.id && o.src && o.src === f.src) { used[gi] = true; out.push([gi, fi]); return; }
      }
    });
    return out;
  }

  var api = { pairVideos: pairVideos };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!g || !g.document) return;
  g.VKeep = api;

  /* ---------- browser part ---------- */
  var doc = g.document, active = new Set(), noop = function () {};

  function collect(node, list) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "VIDEO") { if (node.hasAttribute("data-vo")) list.push(node); }
    else if (node.querySelectorAll) { var l = node.querySelectorAll("video[data-vo]"); for (var i = 0; i < l.length; i++) list.push(l[i]); }
  }
  function describe(el) {
    return {
      id: el.getAttribute("data-vo") || "",
      src: el.getAttribute("src") || "",
      keep: !el.ended && (el.__vkWas === true || el.currentTime > 0.5),
      idle: el.paused && !(el.currentTime > 0)
    };
  }
  function safePause(el) { try { if (!el.paused) el.pause(); } catch (e) { /* ignore */ } }

  function onMutations(records) {
    var goneEls = [], freshEls = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i], j;
      for (j = 0; j < r.removedNodes.length; j++) collect(r.removedNodes[j], goneEls);
      for (j = 0; j < r.addedNodes.length; j++) collect(r.addedNodes[j], freshEls);
    }
    goneEls = goneEls.filter(function (e) { return !e.isConnected; });
    freshEls = freshEls.filter(function (e) { return e.isConnected; });
    if (!goneEls.length) return;
    pairVideos(goneEls.map(describe), freshEls.map(describe)).forEach(function (p) {
      var keep = goneEls[p[0]], neu = freshEls[p[1]];
      try { neu.replaceWith(keep); } catch (e) { return; }
      goneEls[p[0]] = null;
      if (keep.__vkWas && keep.paused) {            // the browser may have paused it while it was out of the page
        var pr; try { pr = keep.play(); } catch (e2) { /* ignore */ }
        if (pr && pr.catch) pr.catch(noop);
      }
    });
    goneEls.forEach(function (el) { if (el) { el.__vkWas = false; safePause(el); active.delete(el); } });
  }

  // One video at a time (also pauses videos that are no longer on the page).
  doc.addEventListener("play", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO") return;
    v.__vkWas = true; active.add(v);
    active.forEach(function (o) { if (o !== v) { o.__vkWas = false; active.delete(o); safePause(o); } });
  }, true);
  ["pause", "ended"].forEach(function (n) {
    doc.addEventListener(n, function (e) {
      var v = e.target;
      if (!v || v.tagName !== "VIDEO") return;
      active.delete(v);
      if (v.isConnected || n === "ended") v.__vkWas = false;   // a pause caused by leaving the page is not the student's choice
    }, true);
  });

  if (g.MutationObserver) new g.MutationObserver(onMutations).observe(doc.documentElement, { childList: true, subtree: true });

  api.state = function () {
    return [].map.call(doc.querySelectorAll("video"), function (v) {
      return { id: v.getAttribute("data-vo"), paused: v.paused, t: Math.round(v.currentTime * 10) / 10, ready: v.readyState, muted: v.muted, was: v.__vkWas === true };
    });
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
