/* narration-sprites.js - small SVG pictures (car, bird, sun, flower) that appear / move when the narration mentions them.
 *
 * Everything animates with CSS (no JS animation loop): cheap on low-end Android phones.
 *  - Pause: the board gets class "nv-paused" -> animation-play-state: paused (setPaused()).
 *  - prefers-reduced-motion: all animation is switched off; sprites simply appear in their final place.
 *  - Seek / restore: start(g, action, true) puts a sprite straight into its final state (no animation).
 * A lesson decides which sprites exist: scene = [{ id, sprite, x, y, scale?, color? }]. Nothing is assumed to be in a lesson.
 * Only attributes written here are used; lesson text is never put into markup.
 */
(function (g) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var STYLE_ID = "nv-sprite-style";
  var CSS = [
    ".nv-sprite{opacity:0;pointer-events:none}",
    ".nv-sprite.nv-in,.nv-sprite.nv-enter,.nv-sprite.nv-pop{opacity:1}",
    ".nv-body,.nv-inner,.nv-wing-l,.nv-wing-r,.nv-rays,.nv-disc,.nv-wheel{transform-box:fill-box}",
    ".nv-enter .nv-body{animation:nvEnter 1.1s ease-out both}",
    ".nv-pop .nv-body{transform-origin:50% 50%;animation:nvPop .6s ease-out both}",
    ".nv-enter .nv-wheel{transform-origin:50% 50%;animation:nvSpin .55s linear 2}",
    ".nv-flap .nv-wing-l{transform-origin:100% 80%;animation:nvFlapL .32s ease-in-out infinite alternate}",
    ".nv-flap .nv-wing-r{transform-origin:0% 80%;animation:nvFlapR .32s ease-in-out infinite alternate}",
    ".nv-sway .nv-inner{transform-origin:50% 100%;animation:nvSway 2.6s ease-in-out infinite alternate}",
    ".nv-glow .nv-rays{transform-origin:50% 50%;animation:nvSpin 9s linear infinite}",
    ".nv-glow .nv-disc{transform-origin:50% 50%;animation:nvPulse 1.1s ease-in-out infinite alternate}",
    ".nv-glow .nv-halo{opacity:.55}",
    ".nv-halo{opacity:0}",
    ".nv-out{opacity:0;transition:opacity .4s}",
    ".nv-paused .nv-sprite,.nv-paused .nv-sprite *{animation-play-state:paused !important}",
    "@keyframes nvEnter{from{transform:translateX(-260px)}to{transform:translateX(0)}}",
    "@keyframes nvPop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}",
    "@keyframes nvSpin{to{transform:rotate(360deg)}}",
    "@keyframes nvFlapL{from{transform:rotate(18deg)}to{transform:rotate(-38deg)}}",
    "@keyframes nvFlapR{from{transform:rotate(-18deg)}to{transform:rotate(38deg)}}",
    "@keyframes nvSway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}",
    "@keyframes nvPulse{from{transform:scale(1)}to{transform:scale(1.12)}}",
    "@media (prefers-reduced-motion:reduce){.nv-sprite,.nv-sprite *{animation:none !important;transition:none !important}}"
  ].join("\n");

  function s(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function cls(e, c) { e.setAttribute("class", c); return e; }

  /* Each builder draws in a box of about 140 x 100 around (0,0)-(140,100) and returns an array of elements. */
  var ART = {
    car: function (c) {
      c = c || "#2f6fdb";
      return [
        s("path", { d: "M8 62 L20 62 L34 36 Q36 32 42 32 L92 32 Q98 32 102 37 L116 60 L132 64 Q136 65 136 70 L136 78 L8 78 Z", fill: c, stroke: "#17356e", "stroke-width": 2, "stroke-linejoin": "round" }),
        s("path", { d: "M40 38 L56 38 L56 58 L30 58 Z M62 38 L92 38 L108 58 L62 58 Z", fill: "#cfe6ff", stroke: "#17356e", "stroke-width": 1.5 }),
        cls(s("g", { transform: "translate(34 80)" }, [s("circle", { r: 13, fill: "#222" }), s("circle", { r: 5, fill: "#bbb" }), s("line", { x1: -9, y1: 0, x2: 9, y2: 0, stroke: "#777", "stroke-width": 2 })]), "nv-wheel"),
        cls(s("g", { transform: "translate(108 80)" }, [s("circle", { r: 13, fill: "#222" }), s("circle", { r: 5, fill: "#bbb" }), s("line", { x1: -9, y1: 0, x2: 9, y2: 0, stroke: "#777", "stroke-width": 2 })]), "nv-wheel")
      ];
    },
    bird: function (c) {
      c = c || "#e08a00";
      return [
        s("path", { d: "M0 84 Q60 74 140 86", fill: "none", stroke: "#6b4a2b", "stroke-width": 7, "stroke-linecap": "round" }),
        cls(s("path", { d: "M62 50 Q40 26 14 34 Q38 52 58 60 Z", fill: c, stroke: "#7a4a00", "stroke-width": 1.5, "stroke-linejoin": "round" }), "nv-wing-l"),
        s("ellipse", { cx: 72, cy: 60, rx: 24, ry: 17, fill: c, stroke: "#7a4a00", "stroke-width": 1.5 }),
        cls(s("path", { d: "M82 50 Q104 26 130 34 Q106 52 86 60 Z", fill: c, stroke: "#7a4a00", "stroke-width": 1.5, "stroke-linejoin": "round" }), "nv-wing-r"),
        s("circle", { cx: 98, cy: 48, r: 11, fill: c, stroke: "#7a4a00", "stroke-width": 1.5 }),
        s("circle", { cx: 101, cy: 46, r: 2.4, fill: "#111" }),
        s("path", { d: "M108 49 L121 53 L108 56 Z", fill: "#f5c542", stroke: "#7a4a00", "stroke-width": 1 }),
        s("path", { d: "M50 62 L30 70 L52 68 Z", fill: "#7a4a00" }),
        s("path", { d: "M68 76 L68 84 M78 76 L78 84", stroke: "#7a4a00", "stroke-width": 2, "stroke-linecap": "round" })
      ];
    },
    sun: function (c) {
      c = c || "#f5b800";
      var rays = [];
      for (var k = 0; k < 12; k++) rays.push(s("line", { x1: 70, y1: 6, x2: 70, y2: 22, stroke: c, "stroke-width": 5, "stroke-linecap": "round", transform: "rotate(" + (k * 30) + " 70 50)" }));
      return [
        cls(s("circle", { cx: 70, cy: 50, r: 46, fill: "#fff3b0" }), "nv-halo"),
        cls(s("g", {}, rays), "nv-rays"),
        cls(s("circle", { cx: 70, cy: 50, r: 22, fill: c, stroke: "#b27d00", "stroke-width": 2 }), "nv-disc")
      ];
    },
    flower: function (c) {
      c = c || "#d94b8c";
      var petals = [];
      for (var k = 0; k < 6; k++) petals.push(s("ellipse", { cx: 70, cy: 22, rx: 10, ry: 16, fill: c, stroke: "#8a1f55", "stroke-width": 1.2, transform: "rotate(" + (k * 60) + " 70 38)" }));
      return [
        s("path", { d: "M70 54 Q66 80 70 100", fill: "none", stroke: "#2e8b3d", "stroke-width": 5, "stroke-linecap": "round" }),
        s("path", { d: "M69 84 Q50 72 40 80 Q52 92 69 88 Z", fill: "#3aa64c", stroke: "#2e8b3d", "stroke-width": 1 }),
        cls(s("g", {}, petals.concat([s("circle", { cx: 70, cy: 38, r: 9, fill: "#f5c542", stroke: "#b27d00", "stroke-width": 1.2 })])), "nv-flower-head")
      ];
    }
  };

  function ensureStyle() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style"); st.id = STYLE_ID; st.textContent = CSS; document.head.appendChild(st);
  }

  /* spec: { id, sprite, x, y, scale?, color? } -> <g class="nv-sprite"> or null for an unknown sprite */
  function build(spec) {
    if (!spec || typeof spec.sprite !== "string" || !ART.hasOwnProperty(spec.sprite)) return null;
    var color = typeof spec.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(spec.color) ? spec.color : null;
    var x = isFinite(spec.x) ? +spec.x : 0, y = isFinite(spec.y) ? +spec.y : 0, sc = isFinite(spec.scale) && spec.scale > 0 ? Math.min(+spec.scale, 4) : 1;
    var inner = cls(s("g", {}, ART[spec.sprite](color)), "nv-inner");
    var body = cls(s("g", {}, [inner]), "nv-body");
    var outer = cls(s("g", { transform: "translate(" + x + " " + y + ") scale(" + sc + ")" }, [body]), "nv-sprite");
    outer.setAttribute("data-sprite", spec.sprite);
    return outer;
  }

  var LOOPS = ["nv-flap", "nv-sway", "nv-glow"], SHOWN = ["nv-in", "nv-enter", "nv-pop", "nv-out"];
  function classes(e) { return (e.getAttribute("class") || "").split(/\s+/).filter(Boolean); }
  function setClasses(e, arr) { e.setAttribute("class", arr.join(" ")); }
  function drop(e, names) { setClasses(e, classes(e).filter(function (c) { return names.indexOf(c) < 0; })); }
  function add(e, c) { var l = classes(e); if (l.indexOf(c) < 0) l.push(c); setClasses(e, l); }
  function visible(e) { var l = classes(e); return l.indexOf("nv-in") >= 0 || l.indexOf("nv-enter") >= 0 || l.indexOf("nv-pop") >= 0; }

  /* Put the sprite in the state the action describes. instant = no entrance animation (seek / restore). */
  function start(e, action, instant) {
    if (!e) return;
    if (action === "exit") { drop(e, SHOWN.concat(LOOPS)); return; }
    if (!visible(e)) {
      drop(e, SHOWN);
      if (instant) add(e, "nv-in");
      else if (action === "enter") add(e, "nv-enter");
      else add(e, "nv-pop");
    }
    if (action === "appear-and-flap" || action === "flap") add(e, "nv-flap");
    if (action === "appear-and-sway" || action === "sway") add(e, "nv-sway");
    if (action === "highlight") add(e, "nv-glow");
  }
  function end(e) { if (e) drop(e, LOOPS); }            // loops stop; the sprite stays where it is
  function reset(e) { if (e) drop(e, SHOWN.concat(LOOPS)); }
  function setPaused(root, on) { if (!root) return; var l = classes(root).filter(function (c) { return c !== "nv-paused"; }); if (on) l.push("nv-paused"); setClasses(root, l); }

  var api = { build: build, start: start, end: end, reset: reset, setPaused: setPaused, ensureStyle: ensureStyle, names: Object.keys(ART), CSS: CSS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.NarrationSprites = api;
})(typeof window !== "undefined" ? window : globalThis);
