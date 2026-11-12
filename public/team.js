// Orbit: Faculty and Developer pages, plus a hidden admin panel to add, edit and delete people.
// The PIN below only opens the panel. The real lock is firestore.rules: only the admin Google account can save.
(function () {
  var CACHE_KEY = 'orbit_people_v1';
  var PIN_HASH = '06dec2661a0564f55ed012ec670f4d8557e91b2d8d0abd6bca06766b33cf3a25';
  var DEFAULTS = [
    { id: 'hamidul-islam-bhuyan', group: 'faculty', name: 'Hamidul Islam Bhuyan', role: 'Managing Director (MD)', bio: '', order: 0, photo: '' },
    { id: 'aminul-islam', group: 'dev', name: 'Aminul Islam', role: 'Developer', bio: '', order: 0, photo: '' }
  ];
  var PEOPLE = null;
  try { PEOPLE = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
  var mvMode = false, vidMode = false, fails = 0, lockedUntil = 0, editing = null, formMsg = '', pendingPhoto = null;

  var css = document.createElement('style');
  css.textContent =
    '.tm-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-top:18px}' +
    '.tm-card{background:var(--card);border:1px solid var(--ln);border-radius:16px;padding:16px 12px;text-align:center}' +
    '.tm-card.lead{grid-column:1/-1;padding:22px 14px}' +
    '.tm-av{width:96px;height:96px;border-radius:50%;object-fit:cover;object-position:center 25%;background:var(--ans);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font:700 30px Baloo 2,Hind,system-ui,sans-serif;color:var(--mut)}' +
    '.tm-card.lead .tm-av{width:128px;height:128px;font-size:40px}' +
    '.tm-n{font-weight:600;font-size:17px;line-height:1.25}.tm-r{color:var(--mut);font-size:14px;margin-top:2px}.tm-b{font-size:14px;margin-top:8px;color:var(--tx)}' +
    '.tm-ver{margin:44px 0 8px;text-align:center}.tm-ver button{background:none;border:0;color:var(--mut);font-size:13px;padding:8px 12px;cursor:pointer}' +
    '.tm-ov{position:fixed;inset:0;z-index:1000;background:var(--bg);color:var(--tx);overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 48px}' +
    '.tm-in{max-width:640px;margin:0 auto}.tm-in h2{font:700 22px Baloo 2,Hind,system-ui,sans-serif;margin:8px 0 14px}' +
    '.tm-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--ln)}' +
    '.tm-row .tm-av{width:44px;height:44px;font-size:16px;margin:0;flex:none}.tm-row .tm-t{flex:1;min-width:0}' +
    '.tm-row .tm-t b{display:block}.tm-row .tm-t span{color:var(--mut);font-size:13px}' +
    '.tm-b2{background:none;color:var(--tx);border:1px solid var(--ln);border-radius:10px;padding:7px 12px;font-weight:600;cursor:pointer}' +
    '.tm-f label{display:block;margin:12px 0 4px;font-size:14px;color:var(--mut)}' +
    '.tm-f input,.tm-f select,.tm-f textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--card);color:var(--tx);font:inherit}' +
    '.tm-f textarea{min-height:70px}.tm-msg{margin-top:12px;font-size:14px;color:#d9534f}' +
    '.tm-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}';
  document.head.appendChild(css);

  function all() {
    var map = {}, order = [];
    DEFAULTS.forEach(function (d) { map[d.id] = d; order.push(d.id); });
    (PEOPLE || []).forEach(function (p) {
      if (p.deleted) { delete map[p.id]; return; }
      if (!map[p.id]) order.push(p.id);
      var base = map[p.id] || {};
      var m = {}; for (var k in base) m[k] = base[k]; for (var k2 in p) m[k2] = p[k2];
      map[p.id] = m;
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }
  function ofGroup(g) {
    return all().filter(function (p) { return p.group === g; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(b.name); });
  }
  function initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''); }
  function av(p) {
    return p.photo ? '<img class="tm-av" src="' + esc(p.photo) + '" alt="' + esc(p.name) + '">'
                   : '<div class="tm-av" aria-hidden="true">' + esc(initials(p.name)) + '</div>';
  }

  window.teamHTML = function (view) {
    var g = view === 'faculty' ? 'faculty' : 'dev';
    var list = ofGroup(g);
    var cards = list.map(function (p, i) {
      return '<div class="tm-card' + (g === 'faculty' && i === 0 ? ' lead' : '') + '">' + av(p) +
        '<div class="tm-n">' + esc(p.name) + '</div><div class="tm-r">' + esc(p.role) + '</div>' +
        (p.bio ? '<div class="tm-b">' + esc(p.bio) + '</div>' : '') + '</div>';
    }).join('');
    return '<h1 style="font-size:26px;margin-top:14px">' + (g === 'faculty' ? 'Faculty' : 'Developer') + '</h1>' +
      '<div class="tm-grid">' + cards + '</div>' +
      '<div class="tm-ver"><button type="button" data-tact="pin">Orbit v1.0</button></div>';
  };

  window.onPeople = function (list) {
    PEOPLE = list;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) {}
    if ((VIEW === 'faculty' || VIEW === 'dev') && DATA) draw();
  };

  // ---- hidden PIN: the button looks normal; nothing appears until the right digits are typed ----
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function listen() {
    if (Date.now() < lockedUntil) return;
    var old = document.getElementById('tm-pin'); if (old) old.remove();
    var i = document.createElement('input');
    i.id = 'tm-pin'; i.type = 'tel'; i.inputMode = 'numeric'; i.autocomplete = 'off'; i.tabIndex = -1;
    i.setAttribute('aria-hidden', 'true');
    i.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none;font-size:16px';
    document.body.appendChild(i);
    var t = setTimeout(stop, 25000);
    function stop() { clearTimeout(t); i.remove(); }
    i.addEventListener('input', function () {
      var v = i.value.replace(/\D/g, '');
      if (v.length < 4) return;
      i.value = '';
      sha('orbit-pin:' + v.slice(0, 4)).then(function (h) {
        if (h === PIN_HASH) { fails = 0; stop(); openAdmin(); }
        else if (++fails >= 5) { fails = 0; lockedUntil = Date.now() + 60000; stop(); }
      });
    });
    i.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== i) stop(); }, 300); });
    i.focus({ preventScroll: true });
  }

  // ---- admin panel ----
  function resize(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        function render(max, q) {
          var k = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL('image/jpeg', q);
        }
        var d = render(480, 0.82);
        if (d.length > 140000) d = render(360, 0.7);
        if (d.length > 140000) return rej(new Error('big'));
        res(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  function closeAdmin() { mvMode = false; vidMode = false; var o = document.getElementById('tm-ov'); if (o) o.remove(); editing = null; formMsg = ''; pendingPhoto = null; }
  function openAdmin() { mvMode = false; vidMode = false; editing = null; formMsg = ''; pendingPhoto = null; paint(); }
  function paint() {
    var o = document.getElementById('tm-ov');
    if (!o) { o = document.createElement('div'); o.id = 'tm-ov'; o.className = 'tm-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); document.body.appendChild(o); }
    if (vidMode) {
      o.innerHTML = '<div class="tm-in"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Videos</h2><button class="tm-b2" data-tact="vidback">Back</button></div><div id="tm-vid"></div></div>';
      var vbox = document.getElementById('tm-vid');
      if (window.VideoAdmin && window.CLOUD && window.CLOUD.videos) window.VideoAdmin.mount(vbox, window.CLOUD.videos);
      else vbox.textContent = 'Cloud load nahi hua. Page refresh karo.';
      return;
    }
    if (mvMode) {
      o.innerHTML = '<div class="tm-in"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Math Video</h2><button class="tm-b2" data-tact="mvback">Back</button></div><div id="tm-mv"></div></div>';
      var box = document.getElementById('tm-mv');
      if (window.MathVideo && window.CLOUD && window.CLOUD.mathVideo) window.MathVideo.mountAdmin(box, window.CLOUD.mathVideo, { preview: function (p) { if (window.MathVideoPlayer) window.MathVideoPlayer.open(p); }, translate: function (p) { return window.CLOUD.token().then(function (tok) { return fetch((window.ORBIT_API || '') + '/api/mathvideo/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ plan: p }), signal: AbortSignal.timeout(80000) }); }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Server ne mana kar diya'); return j; }); }); }, qFields: function (id) { return window.mvQFields ? window.mvQFields(id) : null; }, science: window.CLOUD.scienceVideo, extra: function (c) { if (!window.NarrationAdmin || !window.CLOUD.narration) return; var nb = document.createElement('div'); nb.style.cssText = 'margin-top:18px;padding-top:12px;border-top:1px solid rgba(128,128,128,.35)'; c.el.appendChild(nb); window.NarrationAdmin.mount(nb, { getCode: c.getCode, getPlan: c.getPlan, store: window.CLOUD.narration, preview: function (p, o) { if (window.MathVideoPlayer) window.MathVideoPlayer.open(p, o); } }); } });
      else box.textContent = 'Cloud load nahi hua. Page refresh karo.';
      return;
    }
    var h = '<div class="tm-in"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Team admin</h2><button class="tm-b2" data-tact="close">Close</button></div>';
    if (editing) {
      var p = editing;
      h += '<div class="tm-f"><label>Section</label><select id="tm-g"><option value="faculty"' + (p.group === 'faculty' ? ' selected' : '') + '>Faculty</option><option value="dev"' + (p.group === 'dev' ? ' selected' : '') + '>Developer</option></select>' +
        '<label>Naam</label><input id="tm-n" maxlength="80" value="' + esc(p.name) + '">' +
        '<label>Role (jaise Managing Director, Science Teacher)</label><input id="tm-r" maxlength="80" value="' + esc(p.role) + '">' +
        '<label>Chhota intro (optional)</label><textarea id="tm-b" maxlength="300">' + esc(p.bio) + '</textarea>' +
        '<label>Order (0 sabse pehle dikhta hai)</label><input id="tm-o" type="number" value="' + esc(p.order || 0) + '">' +
        '<label>Photo</label><div style="display:flex;align-items:center;gap:12px">' + av({ name: p.name, photo: pendingPhoto === '' ? '' : (pendingPhoto || p.photo) }) +
        '<input id="tm-f" type="file" accept="image/*"></div>' +
        '<div class="tm-acts"><button class="btn" data-tact="save" style="margin:0">Save</button><button class="tm-b2" data-tact="rmphoto">Photo hatao</button><button class="tm-b2" data-tact="cancel">Cancel</button></div>' +
        (formMsg ? '<div class="tm-msg">' + esc(formMsg) + '</div>' : '') + '</div>';
    } else {
      var qvOn = !!(window.QVideo && window.QVideo.active());
      h += '<div style="margin:0 0 14px"><button class="btn" data-tact="qvmode" style="margin:0">' + (qvOn ? 'Admin mode OFF karo' : 'Admin mode ON karo') + '</button>' +
        '<div style="font-size:13px;color:var(--mut);margin-top:6px">' + (qvOn ? 'Abhi ON hai: question ke 3 dots me Add video dikhta hai.' : 'ON karke app normal user jaise use karo; question ke 3 dots me Add video milega.') + '</div></div>';
      h += '<button class="btn" data-tact="add" style="margin:0 0 8px">+ Add person</button> <button class="tm-b2" data-tact="mv">Math Video</button> <button class="tm-b2" data-tact="vid">Videos</button>';
      all().sort(function (a, b) { return String(a.group).localeCompare(String(b.group)) || (a.order || 0) - (b.order || 0); }).forEach(function (p) {
        h += '<div class="tm-row">' + av(p) + '<div class="tm-t"><b>' + esc(p.name) + '</b><span>' + (p.group === 'faculty' ? 'Faculty' : 'Developer') + ' · ' + esc(p.role) + '</span></div>' +
          '<button class="tm-b2" data-tact="edit" data-id="' + esc(p.id) + '">Edit</button> <button class="tm-b2" data-tact="del" data-id="' + esc(p.id) + '">Delete</button></div>';
      });
      if (formMsg) h += '<div class="tm-msg">' + esc(formMsg) + '</div>';
    }
    o.innerHTML = h + '</div>';
  }
  function errText(e) {
    var c = e && e.code;
    if (c === 'permission-denied') return 'Save nahi hua: ye Google account admin nahi hai. Admin account se log in karo.';
    if (!window.CLOUD) return 'Cloud load nahi hua. Page refresh karke dobara try karo.';
    return 'Save nahi hua. Internet check karke dobara try karo.';
  }
  function upsertLocal(p) {
    var list = (PEOPLE || []).filter(function (x) { return x.id !== p.id; });
    list.push(p); window.onPeople(list);
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'person'; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tact]'); if (!b) return;
    var a = b.dataset.tact, id = b.dataset.id;
    if (a === 'pin') listen();
    else if (a === 'close') closeAdmin();
    else if (a === 'mv') { mvMode = true; paint(); }
    else if (a === 'mvback') { mvMode = false; paint(); }
    else if (a === 'vid') { vidMode = true; paint(); }
    else if (a === 'vidback') { vidMode = false; paint(); }
    else if (a === 'qvmode') {
      var Q = window.QVideo;
      if (!Q) { formMsg = 'Admin mode load nahi hua. Page refresh karo.'; paint(); }
      else if (Q.active()) { Q.setMode(false); formMsg = ''; paint(); }
      else if (!Q.isAdmin()) { formMsg = 'Admin mode ke liye pehle admin Google account se log in karo (menu → Log in).'; paint(); }
      else { Q.setMode(true); closeAdmin(); }
    }
    else if (a === 'add') { editing = { id: '', group: 'faculty', name: '', role: '', bio: '', order: 1, photo: '' }; pendingPhoto = null; formMsg = ''; paint(); }
    else if (a === 'edit') { editing = Object.assign({}, all().filter(function (x) { return x.id === id; })[0]); pendingPhoto = null; formMsg = ''; paint(); }
    else if (a === 'cancel') { editing = null; formMsg = ''; pendingPhoto = null; paint(); }
    else if (a === 'rmphoto') { pendingPhoto = ''; paint(); }
    else if (a === 'save') {
      var name = document.getElementById('tm-n').value.trim(), role = document.getElementById('tm-r').value.trim();
      if (!name || !role) { formMsg = 'Naam aur role likhna zaroori hai.'; paint(); return; }
      var p = {
        id: editing.id || (slug(name) + '-' + Date.now().toString(36)),
        group: document.getElementById('tm-g').value, name: name, role: role,
        bio: document.getElementById('tm-b').value.trim(), order: Number(document.getElementById('tm-o').value) || 0,
        photo: pendingPhoto === '' ? '' : (pendingPhoto || editing.photo || '')
      };
      var file = document.getElementById('tm-f').files[0];
      b.disabled = true;
      (file ? resize(file).then(function (d) { p.photo = d; }) : Promise.resolve())
        .catch(function () { throw { code: 'photo' }; })
        .then(function () { return window.CLOUD.savePerson(p); })
        .then(function () { upsertLocal(p); editing = null; pendingPhoto = null; formMsg = ''; paint(); })
        .catch(function (err) { formMsg = err && err.code === 'photo' ? 'Photo chhoti nahi ho payi. Koi doosri photo chuno.' : errText(err); b.disabled = false; paint(); });
    }
    else if (a === 'del') {
      var person = all().filter(function (x) { return x.id === id; })[0];
      if (!person || !confirm(person.name + ' ko hatana hai?')) return;
      var isDefault = DEFAULTS.some(function (d) { return d.id === id; });
      window.CLOUD.deletePerson(id, isDefault ? { id: id, group: person.group, deleted: true } : null)
        .then(function () {
          if (isDefault) upsertLocal({ id: id, group: person.group, deleted: true });
          else window.onPeople((PEOPLE || []).filter(function (x) { return x.id !== id; }));
          formMsg = ''; paint();
        })
        .catch(function (err) { formMsg = errText(err); paint(); });
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('tm-ov')) closeAdmin(); });
})();
