/*
 * Glasgow Club classes at Gorbals, read by the Android app from Glasgow
 * Club's own search page (in the app's Glasgow Club web view). It picks
 * "Classes", searches, taps "See more" until the week is loaded, and keeps
 * the timetable the page itself receives. Nothing is booked.
 * Served with the web app, so it can be fixed without reinstalling.
 */
async function gymTimetable(p) {
  if (window.__gymBot === p.jobId) return;
  window.__gymBot = p.jobId;

  var log = [];
  var post = function (o) { try { window.GymBridge.post(JSON.stringify(o)); } catch (e) { /* not in the app */ } };
  var note = function (step, extra) {
    var entry = { step: step, at: new Date().toTimeString().slice(0, 8) };
    for (var k in extra || {}) entry[k] = extra[k];
    log.push(entry);
    post({ progress: step });
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var waitFor = async function (fn, ms) {
    var end = Date.now() + (ms || 15000);
    while (Date.now() < end) {
      try { var v = fn(); if (v) return v; } catch (e) { /* keep waiting */ }
      await sleep(250);
    }
    return null;
  };
  var byAria = function (re) {
    return Array.prototype.slice.call(document.querySelectorAll('[aria-label]')).find(function (el) {
      return re.test(el.getAttribute('aria-label') || '') && el.getClientRects().length > 0;
    });
  };
  var byText = function (re) {
    return Array.prototype.slice.call(document.querySelectorAll('button, a, [role="button"]')).find(function (el) {
      return re.test(((el.innerText || '') + '').replace(/\s+/g, ' ').trim()) && el.getClientRects().length > 0 && !el.disabled;
    });
  };
  // A full tap, for dropdowns that listen for mouse or pointer events.
  var tap = function (el) {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      var Ev = type.indexOf('pointer') === 0 && window.PointerEvent ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true, view: window }));
    });
  };

  // Keep every timetable response the page receives.
  var batches = [];
  var keep = function (url, body) {
    if (!/\/api\/availability\/V2\/sessions/i.test(url || '')) return;
    try {
      var data = typeof body === 'string' ? JSON.parse(body) : body;
      if (Array.isArray(data)) batches.push(data);
    } catch (e) { /* not JSON */ }
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__gymUrl = url;
    return open.apply(this, arguments);
  };
  var send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    xhr.addEventListener('load', function () { keep(xhr.__gymUrl, xhr.responseText); });
    return send.apply(this, arguments);
  };
  var origFetch = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : input && input.url;
    return origFetch.apply(this, arguments).then(function (res) {
      if (/\/api\/availability\/V2\/sessions/i.test(url || '')) res.clone().json().then(function (d) { keep(url, d); }).catch(function () {});
      return res;
    });
  };

  var finish = function (o) {
    note('finish', { ok: !!o.ok, reason: o.reason || '' });
    o.done = true;
    o.log = log;
    post(o);
  };

  try {
    await waitFor(function () { return document.readyState === 'complete'; }, 10000);

    // 1. What are you looking to do: Classes.
    var toggle = await waitFor(function () { return byAria(/What are you looking to do: Toggle/i); }, 20000);
    if (!toggle) return finish({ ok: false, reason: 'stuck', message: "Couldn't find Glasgow Club's class search." });
    tap(toggle);
    var option = await waitFor(function () { return byAria(/^Select Classes option$/i); }, 6000);
    if (!option) {
      toggle.click();
      option = await waitFor(function () { return byAria(/^Select Classes option$/i); }, 6000);
    }
    if (!option) return finish({ ok: false, reason: 'stuck', message: "Couldn't pick Classes in Glasgow Club's search." });
    tap(option);
    note('classes');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(300);

    // 2. Search, then See more until the week is in.
    var search = await waitFor(function () { return byAria(/^Search for activities$/i) || byText(/^Search$/i); }, 6000);
    if (!search) return finish({ ok: false, reason: 'stuck', message: "Couldn't find Glasgow Club's Search button." });
    var before = batches.length;
    search.click();
    note('search');
    await waitFor(function () { return batches.length > before; }, 20000);
    for (var i = 0; i < (p.pages || 10); i++) {
      var more = await waitFor(function () { return byText(/^See more$/i); }, 2500);
      if (!more) break;
      var n = batches.length;
      more.click();
      await waitFor(function () { return batches.length > n; }, 8000);
      if (batches.length === n) break;
    }
    note('loaded', { batches: batches.length });

    // 3. One row per class session.
    var seen = {};
    var sessions = [];
    batches.forEach(function (batch) {
      batch.forEach(function (a) {
        if (a.description && !/class/i.test(a.description)) return;
        (a.locations || []).forEach(function (loc) {
          (loc.slots || []).forEach(function (s) {
            var key = a.id + '|' + s.startTime;
            if (seen[key]) return;
            seen[key] = true;
            sessions.push({
              activityId: a.id,
              group: a.activityGroupDescription || '',
              name: (a.name || '').replace(/\s+/g, ' ').trim(),
              instructor: (a.webComments || '').trim(),
              location: loc.locationNameToDisplay || '',
              start: s.startTime,
              end: s.endTime,
              bookableFrom: s.bookableFrom || null,
              bookableUntil: s.bookableUntil || null,
              spaces: s.availability ? s.availability.inCentre : null,
              capacity: a.capacity ? a.capacity.maxInCentreBookees : null,
              status: s.status || '',
              webBookable: a.webBookable !== false,
            });
          });
        });
      });
    });
    if (!sessions.length) return finish({ ok: false, reason: 'empty', message: 'Glasgow Club returned no classes.' });
    finish({ ok: true, sessions: sessions });
  } catch (e) {
    finish({ ok: false, reason: 'error', message: String((e && e.message) || e) });
  }
}
