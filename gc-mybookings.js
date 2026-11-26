/*
 * Reads Alice's upcoming Glasgow Club bookings from her own My Bookings page,
 * in the Android app's Glasgow Club web view, so the app shows what's really
 * booked (including anything booked on the website). Read only.
 * Served with the web app, so it can be fixed without reinstalling.
 */
async function gymMyBookings(p) {
  if (window.__gymBot === p.jobId) return;
  window.__gymBot = p.jobId;

  var post = function (o) { try { window.GymBridge.post(JSON.stringify(o)); } catch (e) { /* not in the app */ } };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var waitFor = async function (fn, ms) {
    var end = Date.now() + (ms || 15000);
    while (Date.now() < end) {
      try { var v = fn(); if (v) return v; } catch (e) { /* keep waiting */ }
      await sleep(250);
    }
    return null;
  };
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  try {
    var text = await waitFor(function () {
      var t = (document.body && document.body.innerText) || '';
      return /upcoming bookings/i.test(t) || /log ?in|sign ?in|do you already have an account/i.test(t) ? t : null;
    }, 20000);
    if (!text) return post({ done: true, ok: false, reason: 'stuck', message: "Couldn't read My Bookings." });
    if (!/upcoming bookings/i.test(text)) return post({ done: true, needsSignIn: true });

    await sleep(800); // let the list finish rendering
    text = document.body.innerText;
    var start = text.search(/upcoming bookings/i);
    var end = text.search(/past bookings/i);
    var upcoming = text.slice(start, end > start ? end : undefined);

    var bookings = [];
    var re = /([^\n]+)\n+\s*\w+day (\d{1,2})(?:st|nd|rd|th)? (\w+) (\d{4}) (\d{1,2}):(\d{2})\s*\n+\s*([^\n]+)\n+\s*Booking ref:\s*(\d+)/gi;
    var m;
    while ((m = re.exec(upcoming))) {
      var month = MONTHS.indexOf(m[3].toLowerCase());
      if (month < 0) continue;
      var when = new Date(+m[4], month, +m[2], +m[5], +m[6]);
      bookings.push({ title: m[1].trim(), start: when.toISOString(), place: m[7].trim(), ref: m[8] });
    }
    post({ done: true, ok: true, bookings: bookings, none: /no upcoming bookings/i.test(upcoming) });
  } catch (e) {
    post({ done: true, ok: false, reason: 'error', message: String((e && e.message) || e) });
  }
}
