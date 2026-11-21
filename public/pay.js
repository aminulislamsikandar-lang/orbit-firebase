// pay.js - Razorpay Checkout for Orbit. window.OrbitPay.start() opens the payment window; on success the server unlocks the paid videos
// and this file fires the "orbit-paid" event (index.html clears the old "subscription chahiye" messages).
// The Key Secret is never here: the server makes the order (/api/pay/order) and checks the payment (/api/pay/verify).
(function (g) {
  'use strict';
  var PEND = 'orbit_pay_pending', busy = false;

  function store(k, v) { try { if (v == null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function load(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }

  function say(t) {
    var d = document.getElementById('orbitPayMsg');
    if (!d) {
      d = document.createElement('div'); d.id = 'orbitPayMsg'; d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:90%;padding:12px 16px;border-radius:12px;background:#222;color:#fff;font-size:14px;text-align:center;z-index:99999';
      document.body.appendChild(d);
    }
    d.textContent = t; d.style.display = 'block';
    clearTimeout(say.t); say.t = setTimeout(function () { d.style.display = 'none'; }, 7000);
  }

  function api(path, body) {
    return Promise.resolve(g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : null).then(function (tok) {
      if (!tok) throw new Error('Pehle Google se log in karo (menu → Log in).');
      return fetch((g.ORBIT_API || '') + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify(body || {}), signal: AbortSignal.timeout(90000)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || 'Kuch gadbad hui. Dobara try karo.'); e.code = j.code; throw e; }
          return j;
        });
      });
    });
  }

  function loadCheckout() {
    if (g.Razorpay) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = ok; s.onerror = function () { no(new Error('Payment window khul nahi payi. Internet check karo.')); };
      document.head.appendChild(s);
    });
  }

  // The payment is saved here until the server confirms it, so a closed tab or a dropped network never loses a paid unlock.
  function tryVerify(p, n) {
    return api('/api/pay/verify', p).then(function (j) {
      store(PEND, null); say('Payment ho gaya. Videos unlock ho gaye.');
      g.dispatchEvent(new CustomEvent('orbit-paid', { detail: j }));
      return true;
    }).catch(function (e) {
      if (e && /^(bad_signature|not_yours|bad_request)$/.test(e.code || '')) { store(PEND, null); say(e.message); return false; }
      if (n < 3) return new Promise(function (r) { setTimeout(r, [2000, 5000, 10000][n]); }).then(function () { return tryVerify(p, n + 1); });
      say('Payment ho gaya, par abhi check nahi hua. "Videos unlock karo" dobara dabao. Paisa safe hai.');
      return false;
    });
  }

  function pending() {
    var raw = load(PEND), p = null;
    try { p = raw ? JSON.parse(raw) : null; } catch (e) { p = null; }
    if (!p || !p.razorpay_order_id || !p.razorpay_payment_id || !p.razorpay_signature) return Promise.resolve(false);
    return tryVerify(p, 0);
  }

  function open(o) {
    return new Promise(function (resolve) {
      var u = (g.orbitUser && g.orbitUser()) || {};
      var rz = new g.Razorpay({
        key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId,
        name: 'Orbit', description: 'Video lessons (' + o.days + ' din)',
        prefill: { name: u.displayName || u.name || '', email: u.email || '' },
        theme: { color: '#111111' },
        handler: function (resp) {
          var p = { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature };
          store(PEND, JSON.stringify(p)); say('Payment check ho raha hai...');
          tryVerify(p, 0).then(resolve);
        },
        modal: { ondismiss: function () { resolve(false); } }
      });
      rz.on('payment.failed', function () { say('Payment nahi hua. Paisa nahi kata. Dobara try karo.'); });
      rz.open();
    });
  }

  function start() {
    if (busy) return Promise.resolve(false);
    busy = true; say('Payment shuru ho raha hai...');
    try { fetch((g.ORBIT_API || '') + '/api/ping').catch(function () {}); } catch (e) { /* wakes the free server */ }
    return pending().then(function (paid) {
      if (paid) return true;
      return api('/api/pay/order', {}).then(function (o) { return loadCheckout().then(function () { return open(o); }); });
    }).catch(function (e) { say((e && e.message) || 'Kuch gadbad hui. Dobara try karo.'); return false; })
      .then(function (r) { busy = false; return r; });
  }

  g.OrbitPay = { start: start };
  // A payment that was made but not yet confirmed (tab closed, network lost) is confirmed again a few seconds after the app opens.
  if (load(PEND)) setTimeout(function () { if (!busy) pending().catch(function () {}); }, 8000);
})(window);
