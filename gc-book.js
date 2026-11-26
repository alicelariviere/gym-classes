/*
 * Glasgow Club booking, run by the Android app on Glasgow Club's own booking
 * page (inside the app's Glasgow Club web view, signed in as Alice). Used for
 * gym check-ins (the next free slot from a time) and classes (one exact time).
 * It taps through the same steps a person would: pick the slot, check the
 * price is £0, book, and confirm. It stops rather than pay.
 * Served with the web app, so it can be fixed without reinstalling.
 * Reports progress and a step log to the app through GymBridge.
 */
async function gymBook(p) {
  if (window.__gymBot === p.jobId) return;
  window.__gymBot = p.jobId;

  var KEY = 'gymBot:' + p.jobId;
  var state = JSON.parse(sessionStorage.getItem(KEY) || '{"phase":"pick","log":[]}');
  var save = function () { sessionStorage.setItem(KEY, JSON.stringify(state)); };
  var post = function (o) { try { window.GymBridge.post(JSON.stringify(o)); } catch (e) { /* not in the app */ } };
  var note = function (step, extra) {
    var entry = { step: step, at: new Date().toTimeString().slice(0, 8), path: location.pathname };
    for (var k in extra || {}) entry[k] = extra[k];
    state.log.push(entry);
    save();
    post({ progress: step });
  };
  var finish = function (o) {
    note('finish', { ok: !!o.ok, reason: o.reason || '' });
    o.done = true;
    o.log = state.log;
    if (state.slot && !o.slot) o.slot = state.slot;
    sessionStorage.removeItem(KEY);
    post(o);
  };

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var waitFor = async function (fn, ms) {
    var end = Date.now() + (ms || 15000);
    while (Date.now() < end) {
      try { var v = fn(); if (v) return v; } catch (e) { /* keep waiting */ }
      await sleep(300);
    }
    return null;
  };
  var shown = function (el) {
    return !!el && el.getClientRects().length > 0 && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
  };
  var text = function (el) { return ((el && (el.innerText || el.value)) || '').replace(/\s+/g, ' ').trim(); };
  var aria = function (el) { return (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); };
  var buttons = function () {
    return Array.prototype.slice
      .call(document.querySelectorAll('button, [role="button"], a.btn, input[type="submit"]'))
      .filter(function (b) { return shown(b) && !b.closest('header, nav'); });
  };
  var byText = function (re) { return buttons().find(function (b) { return re.test(text(b)); }); };
  var pageText = function () { return (document.body && document.body.innerText) || ''; };
  var pounds = function (s) {
    var out = [], re = /£\s?(\d+(?:\.\d{1,2})?)/g, m;
    while ((m = re.exec(s || ''))) out.push(parseFloat(m[1]));
    return out;
  };
  var snapshot = function () {
    var h = document.querySelector('h1, h2, h3');
    return {
      heading: h ? text(h) : '',
      buttons: buttons().slice(0, 14).map(function (b) { return text(b) || aria(b); }),
      excerpt: pageText().replace(/\s+/g, ' ').slice(0, 600),
    };
  };

  var SUCCESS = /booking (is )?confirmed|thank you for your (booking|order)|booking reference|successfully booked|you('|’)re booked|order (is )?complete|payment (was )?successful/i;
  var SIGNED_OUT = /do you already have an account|log ?in to (book|continue)|sign in to (book|continue)/i;
  var RESTRICTED = /restriction on this activity|access restricted|not (eligible|permitted)/i;
  var maxPrice = typeof p.maxPrice === 'number' ? p.maxPrice : 0;

  var minutesOf = function (s) {
    var m = /at (\d{1,2}):(\d{2}) ?(AM|PM)/i.exec(s);
    if (!m) return null;
    var h = (+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0);
    return h * 60 + +m[2];
  };
  var hhmm = function (mins) { return Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0'); };

  try {
    await waitFor(function () { return document.readyState === 'complete'; }, 10000);

    if (SUCCESS.test(pageText()) && state.phase !== 'pick') return finish({ ok: true });

    // 1. Pick the slot: an exact time for a class, or the first free one from a time for the gym.
    if (state.phase === 'pick') {
      var after = new Date(p.after);
      var afterMin = after.getHours() * 60 + after.getMinutes();
      var exact = !!p.exact;
      var slots = await waitFor(function () {
        var list = buttons().filter(function (b) { return /^Book now: for /i.test(aria(b)); });
        return list.length ? list : null;
      }, 20000);
      if (!slots) {
        if (SIGNED_OUT.test(pageText()) || /login|signin|sign-in/i.test(location.href)) return finish({ needsSignIn: true });
        return finish({ ok: false, reason: 'no-slots', message: 'No gym slots to book right now.', snapshot: snapshot() });
      }
      var pick = slots.find(function (b) {
        var m = minutesOf(aria(b));
        return m !== null && (exact ? m === afterMin : m >= afterMin);
      });
      if (!pick) {
        return finish({
          ok: false,
          reason: exact ? 'full' : 'no-slots',
          message: exact ? 'That class can’t be booked now: it may be full.' : 'No free gym slots left today.',
          snapshot: snapshot(),
        });
      }
      state.slot = hhmm(minutesOf(aria(pick)));
      state.phase = 'modal';
      note('pick', { slot: state.slot });
      pick.click();
    }

    // 2. The slot form: check it's allowed and free, then book.
    if (state.phase === 'modal') {
      var bookBtn = await waitFor(function () {
        if (SIGNED_OUT.test(pageText())) return 'signed-out';
        return buttons().find(function (b) {
          if (/^Book now: for/i.test(aria(b))) return false; // the slot buttons, not the form
          return /^Book .+ for £\s?\d/i.test(aria(b)) || /^Book( now| for £\s?\d+(\.\d{1,2})?)?$/i.test(text(b));
        }) || null;
      }, 12000);
      if (bookBtn === 'signed-out') return finish({ needsSignIn: true });
      if (!bookBtn) {
        var t = pageText();
        if (RESTRICTED.test(t)) {
          var line = (t.match(/[^\n]*restrict[^\n]*/i) || [''])[0].trim();
          return finish({ ok: false, reason: 'restricted', message: line || 'Glasgow Club has a restriction on this booking.', snapshot: snapshot() });
        }
        return finish({ ok: false, reason: 'stuck', message: "Couldn't find the Book button.", snapshot: snapshot() });
      }
      var price = pounds(aria(bookBtn) + ' ' + text(bookBtn));
      if (price.length && price[0] > maxPrice) {
        return finish({ ok: false, reason: 'price', message: 'Not booked: Glasgow Club wanted £' + price[0].toFixed(2) + '.', snapshot: snapshot() });
      }
      state.phase = 'checkout';
      note('book', { button: text(bookBtn) });
      bookBtn.click();
      await sleep(1500);
    }

    // 3. Basket and checkout: keep going only while everything is £0.
    if (state.phase === 'checkout') {
      var steps = [
        /^(proceed to )?check ?out$/i,
        /^(continue|next)$/i,
        /^(confirm|complete|place)( (booking|order|and pay))?$/i,
        /^pay( now)?( £\s?0(\.00?)?)?$/i,
        /^book$/i,
      ];
      for (var i = 0; i < 10; i++) {
        var page = pageText();
        if (SUCCESS.test(page)) return finish({ ok: true });
        if (SIGNED_OUT.test(page)) return finish({ needsSignIn: true });
        var amounts = pounds(page);
        var dear = amounts.filter(function (a) { return a > maxPrice; });
        var next = null;
        for (var s = 0; s < steps.length && !next; s++) next = byText(steps[s]);
        if (next) {
          if (dear.length && /pay|confirm|complete|place|book/i.test(text(next))) {
            return finish({ ok: false, reason: 'price', message: 'Stopped before paying: the basket shows £' + dear[0].toFixed(2) + '.', snapshot: snapshot() });
          }
          // Tick any booking terms box, as you would by hand.
          Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]')).forEach(function (c) {
            var lab = (c.closest('label') || document.querySelector('label[for="' + c.id + '"]') || {}).innerText || '';
            if (!c.checked && /terms|agree|conditions/i.test(lab)) { c.click(); note('ticked', { label: lab.slice(0, 80) }); }
          });
          note('click', { button: text(next) });
          next.click();
          await sleep(2000);
        } else {
          await sleep(1500);
        }
      }
      return finish({ ok: false, reason: 'stuck', message: 'Got stuck before the booking was confirmed.', snapshot: snapshot() });
    }
  } catch (e) {
    finish({ ok: false, reason: 'error', message: String((e && e.message) || e), snapshot: snapshot() });
  }
}
