/* Feedback layer for Alice's phone.
   Tap the pencil, tap anything (or "Whole screen"), type a note.
   "Send" opens the Android share sheet so the notes go straight into Claude.
   On by default. Turn off with ?feedback=off, back on with ?feedback=on. */

declare const __BUILD__: string;

interface Note {
  route: string;
  screen: string;
  selector: string;
  text: string | null;
  rect: [number, number, number, number];
  px: number;
  py: number;
  state: unknown;
  note: string;
}

const NOTES_KEY = 'gym-feedback-notes';
const FLAG_KEY = 'gym-feedback';

export function startFeedback() {
  const param = new URLSearchParams(location.search).get('feedback');
  try {
    if (param === 'off' || param === 'on') localStorage.setItem(FLAG_KEY, param);
    if (localStorage.getItem(FLAG_KEY) === 'off') return;
  } catch {
    // Storage blocked: stay on.
  }

  const errors: string[] = [];
  addEventListener('error', (e) =>
    errors.push((e.message || 'error') + (e.filename ? ` @ ${e.filename.split('/').pop()}:${e.lineno}` : '')),
  );
  addEventListener('unhandledrejection', (e) =>
    errors.push('unhandled promise: ' + String((e.reason && e.reason.message) || e.reason)),
  );

  let notes: Note[] = [];
  try {
    notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
  } catch {
    notes = [];
  }
  const save = () => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      // Ignore.
    }
  };

  const css = document.createElement('style');
  css.textContent = `
  :root{--fb-font:"Helvetica Neue",Inter,system-ui,sans-serif}
  .fb-fab{position:fixed;right:max(14px,calc(50vw - 201px));bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147483000;
    width:48px;height:48px;border-radius:50%;border:0;background:#111;color:#fff;display:grid;place-items:center;
    box-shadow:0 6px 18px rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent}
  .fb-fab.on{background:#138A93}
  .fb-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;
    background:#D6457F;color:#fff;font:700 11px/20px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff}
  .fb-banner{position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top) + 10px);z-index:2147483000;
    max-width:410px;margin:0 auto;background:#111;color:#fff;border-radius:16px;padding:12px 12px 12px 16px;
    display:flex;align-items:center;gap:8px;font:500 14px/1.3 var(--fb-font);box-shadow:0 10px 30px rgba(0,0,0,.3)}
  .fb-banner span{flex:1}
  .fb-banner button{border:0;border-radius:999px;padding:9px 13px;font:600 13px var(--fb-font);background:#2a2a2a;color:#fff;white-space:nowrap}
  .fb-hi{position:absolute;z-index:2147482998;pointer-events:none;border:2px solid #138A93;border-radius:6px;
    background:rgba(19,138,147,.14)}
  .fb-pin{position:absolute;z-index:2147482999;pointer-events:none;width:22px;height:22px;border-radius:50%;
    background:#138A93;color:#fff;font:700 12px system-ui,sans-serif;display:grid;place-items:center;
    transform:translate(-50%,-50%);box-shadow:0 0 0 2px #fff}
  .fb-sheet{position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top) + 10px);z-index:2147483001;
    max-width:410px;margin:0 auto;background:#fff;color:#111;border-radius:18px;padding:16px;
    box-shadow:0 18px 50px rgba(0,0,0,.35);font:400 15px/1.35 var(--fb-font)}
  .fb-sheet h3{margin:0 0 2px;font:700 15px var(--fb-font)}
  .fb-sheet p{margin:0 0 10px;color:#757575;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fb-sheet textarea{width:100%;min-height:96px;border:1.5px solid #e5e5e5;border-radius:12px;padding:11px;
    font:400 16px/1.35 var(--fb-font);color:#111;resize:none;box-sizing:border-box;outline:none}
  .fb-sheet textarea:focus{border-color:#111}
  .fb-row{display:flex;gap:8px;margin-top:10px}
  .fb-row button,.fb-col button{flex:1;border:0;border-radius:999px;padding:13px;font:600 15px var(--fb-font);background:#111;color:#fff}
  .fb-row button.alt,.fb-col button.alt{background:#fff;color:#111;box-shadow:inset 0 0 0 1.5px rgba(17,17,17,.18)}
  .fb-col{display:flex;flex-direction:column;gap:8px}
  .fb-list{margin:0 0 12px;padding:0;list-style:none;max-height:40vh;overflow:auto}
  .fb-list li{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #efefef;font-size:14px}
  .fb-list li b{flex:none;width:22px;height:22px;border-radius:50%;background:#138A93;color:#fff;font:700 12px/22px system-ui;text-align:center}
  .fb-list li span{flex:1;min-width:0}
  .fb-list li small{display:block;color:#757575;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fb-list li button{flex:none;border:0;background:none;color:#9a9a9a;font-size:18px;padding:0 4px}
  .fb-out{width:100%;height:40vh;border:1.5px solid #e5e5e5;border-radius:12px;padding:10px;box-sizing:border-box;
    font:400 12px/1.45 ui-monospace,Menlo,monospace;resize:none}
  .fb-toast{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 14px);transform:translateX(-50%);z-index:2147483002;
    background:#111;color:#fff;border-radius:999px;padding:10px 16px;font:500 14px var(--fb-font);box-shadow:0 8px 24px rgba(0,0,0,.3)}`;
  document.head.appendChild(css);

  const pencil = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>`;
  const cross = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

  const fab = document.createElement('button');
  fab.className = 'fb-fab';
  fab.setAttribute('aria-label', 'Feedback');
  document.body.appendChild(fab);

  const hi = document.createElement('div');
  hi.className = 'fb-hi';
  hi.style.display = 'none';
  document.body.appendChild(hi);

  let armed = false;
  let banner: HTMLDivElement | null = null;
  let sheet: HTMLDivElement | null = null;

  const mine = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest('.fb-fab,.fb-banner,.fb-sheet,.fb-toast');

  const route = () => location.hash.replace(/^#/, '') || '/';
  const screenName = () => {
    const h = document.querySelector('#root h1');
    return h ? (h as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : route();
  };

  const toast = (msg: string) => {
    const t = document.createElement('div');
    t.className = 'fb-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };

  const paint = () => {
    fab.classList.toggle('on', armed);
    fab.innerHTML = (armed ? cross : pencil) + (notes.length && !armed ? `<span class="fb-badge">${notes.length}</span>` : '');
    document.querySelectorAll('.fb-pin').forEach((p) => p.remove());
    const here = route();
    notes.forEach((n, i) => {
      if (n.route !== here || n.selector === '(whole screen)') return;
      const d = document.createElement('div');
      d.className = 'fb-pin';
      d.style.left = n.px + 'px';
      d.style.top = n.py + 'px';
      d.textContent = String(i + 1);
      document.body.appendChild(d);
    });
  };

  const closeSheet = () => {
    sheet?.remove();
    sheet = null;
    hi.style.display = 'none';
  };

  const setArmed = (v: boolean) => {
    armed = v;
    banner?.remove();
    banner = null;
    if (v) {
      closeSheet();
      banner = document.createElement('div');
      banner.className = 'fb-banner';
      banner.innerHTML = `<span>Tap the thing you want to comment on</span><button data-whole>Whole screen</button>`;
      banner.querySelector('[data-whole]')!.addEventListener('click', () => {
        setArmed(false);
        ask(null);
      });
      document.body.appendChild(banner);
    }
    paint();
  };

  /* a selector specific enough to act on, short enough to read */
  const classesOf = (n: Element) =>
    (typeof (n as HTMLElement).className === 'string' ? (n as HTMLElement).className : '')
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.includes(':') && !c.includes('[') && !c.includes('/'));
  const selectorOf = (el: Element) => {
    if (el.id) return '#' + el.id;
    const parts: string[] = [];
    for (let n: Element | null = el; n && n.id !== 'root' && parts.length < 4; n = n.parentElement) {
      if (n.id) {
        parts.unshift('#' + n.id);
        break;
      }
      const cls = classesOf(n).slice(0, 2).join('.');
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return parts.join(' > ');
  };
  const textOf = (el: Element) => {
    const own = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (own.trim()) return own.trim().slice(0, 80);
    const txt = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return txt ? txt.slice(0, 80) : null;
  };
  /* a tap on an icon or a word means the button or row around it */
  const targetOf = (t: Element) => {
    const svg = t.closest('svg');
    const base = svg ? svg.parentElement || t : t;
    return base.closest('button, a, input, label, [role="button"]') || base;
  };

  const showHighlight = (r: DOMRect) => {
    Object.assign(hi.style, {
      display: 'block',
      left: r.left + scrollX - 3 + 'px',
      top: r.top + scrollY - 3 + 'px',
      width: r.width + 6 + 'px',
      height: r.height + 6 + 'px',
    });
  };

  const stateNow = () => {
    let s: unknown = null;
    try {
      const fn = (window as unknown as { __gymState?: () => unknown }).__gymState;
      if (typeof fn === 'function') s = fn();
    } catch (e) {
      s = { stateError: String(e) };
    }
    return s;
  };

  function ask(target: { el: Element; x: number; y: number } | null) {
    closeSheet();
    const el = target?.el;
    const r = el ? el.getBoundingClientRect() : null;
    if (r) showHighlight(r);
    const label = el ? textOf(el) : null;
    sheet = document.createElement('div');
    sheet.className = 'fb-sheet';
    sheet.innerHTML = `<h3>${el ? 'Note on this' : 'Note on this screen'}</h3>
      <p></p>
      <textarea placeholder="What's wrong, or what should it do?"></textarea>
      <div class="fb-row"><button class="alt" data-x>Cancel</button><button data-ok>Add note</button></div>`;
    sheet.querySelector('p')!.textContent = label ? `“${label}”` : screenName();
    document.body.appendChild(sheet);
    const ta = sheet.querySelector('textarea')!;
    ta.focus();
    sheet.querySelector('[data-x]')!.addEventListener('click', closeSheet);
    sheet.querySelector('[data-ok]')!.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) {
        ta.focus();
        return;
      }
      notes.push({
        route: route(),
        screen: screenName(),
        selector: el ? selectorOf(el) : '(whole screen)',
        text: label,
        rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : [0, 0, innerWidth, innerHeight],
        px: target ? target.x + scrollX : 0,
        py: target ? target.y + scrollY : 0,
        state: stateNow(),
        note: text,
      });
      save();
      closeSheet();
      paint();
      toast(`Note ${notes.length} added`);
    });
  }

  const markdown = () => {
    const standalone = matchMedia('(display-mode: standalone)').matches;
    let out = '## Gym app feedback\n\n';
    out += `- Build: ${__BUILD__}\n`;
    out += `- Phone: ${innerWidth}x${innerHeight} @${Math.round(devicePixelRatio * 100) / 100}x, ${standalone ? 'installed app' : 'in Chrome'}\n`;
    out += `- Sent: ${new Date().toLocaleString('en-GB')}\n\n`;
    notes.forEach((n, i) => {
      out += `### ${i + 1}. ${n.screen}${n.text ? ` · ${n.text}` : ''}\n`;
      out += `- Screen: \`#${n.route}\`\n`;
      out += `- Element: \`${n.selector}\`\n`;
      if (n.selector !== '(whole screen)') out += `- Position: x${n.rect[0]} y${n.rect[1]} ${n.rect[2]}x${n.rect[3]}\n`;
      if (n.state) out += `- State: ${JSON.stringify(n.state)}\n`;
      out += `- Note: ${n.note}\n\n`;
    });
    if (errors.length) {
      out += '### Errors while I was looking\n';
      [...new Set(errors)].slice(0, 10).forEach((e) => (out += `- ${e}\n`));
      out += '\n';
    }
    return out;
  };

  const copyPanel = (text: string) => {
    closeSheet();
    sheet = document.createElement('div');
    sheet.className = 'fb-sheet';
    sheet.innerHTML = `<h3>Copy your notes</h3><p>Then paste them into Claude.</p><textarea class="fb-out" readonly></textarea>
      <div class="fb-row"><button class="alt" data-x>Close</button><button data-c>Copy</button></div>`;
    document.body.appendChild(sheet);
    const ta = sheet.querySelector('textarea')!;
    ta.value = text;
    sheet.querySelector('[data-x]')!.addEventListener('click', closeSheet);
    sheet.querySelector('[data-c]')!.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
      } catch {
        ta.select();
        btn.textContent = 'Select and copy';
      }
    });
  };

  const send = async () => {
    const text = markdown();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gym app feedback', text });
        closeSheet();
        notes = [];
        save();
        paint();
        toast('Sent. Notes cleared.');
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // closed the share sheet
      }
    }
    copyPanel(text);
  };

  const menu = () => {
    closeSheet();
    sheet = document.createElement('div');
    sheet.className = 'fb-sheet';
    sheet.innerHTML = `<h3>${notes.length} ${notes.length === 1 ? 'note' : 'notes'}</h3><p>Send them to Claude when you're ready.</p>
      <ul class="fb-list"></ul>
      <div class="fb-col"><button data-send>Send ${notes.length === 1 ? 'note' : `${notes.length} notes`}</button>
      <button class="alt" data-add>Add another note</button><button class="alt" data-x>Close</button></div>`;
    const list = sheet.querySelector('ul')!;
    notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${i + 1}</b><span></span><button aria-label="Delete note">×</button>`;
      const span = li.querySelector('span')!;
      span.textContent = n.note;
      const small = document.createElement('small');
      small.textContent = n.screen + (n.text ? ` · ${n.text}` : '');
      span.appendChild(small);
      li.querySelector('button')!.addEventListener('click', () => {
        notes.splice(i, 1);
        save();
        paint();
        if (notes.length) menu();
        else closeSheet();
      });
      list.appendChild(li);
    });
    sheet.querySelector('[data-send]')!.addEventListener('click', send);
    sheet.querySelector('[data-add]')!.addEventListener('click', () => setArmed(true));
    sheet.querySelector('[data-x]')!.addEventListener('click', closeSheet);
    document.body.appendChild(sheet);
  };

  fab.addEventListener('click', () => {
    if (armed) return setArmed(false);
    if (sheet) return closeSheet();
    if (notes.length) menu();
    else setArmed(true);
  });

  /* while picking, keep taps away from the app's own buttons and links */
  const swallow = (e: Event) => {
    if (armed && !mine(e.target)) e.stopPropagation();
  };
  document.addEventListener('pointerdown', swallow, true);
  document.addEventListener('mousedown', swallow, true);
  document.addEventListener('touchstart', swallow, true);
  document.addEventListener('pointerup', swallow, true);
  document.addEventListener('mouseup', swallow, true);
  document.addEventListener(
    'click',
    (e) => {
      if (!armed || mine(e.target) || !(e.target instanceof Element)) return;
      e.preventDefault();
      e.stopPropagation();
      const el = targetOf(e.target);
      setArmed(false);
      ask({ el, x: e.clientX, y: e.clientY });
    },
    true,
  );
  /* the router moves between screens with pushState, which fires no event */
  let lastRoute = route();
  const onRoute = () => {
    if (route() === lastRoute) return;
    lastRoute = route();
    closeSheet();
    paint();
  };
  for (const m of ['pushState', 'replaceState'] as const) {
    const orig = history[m].bind(history);
    history[m] = (...args: Parameters<History['pushState']>) => {
      orig(...args);
      setTimeout(onRoute);
    };
  }
  addEventListener('popstate', onRoute);
  addEventListener('hashchange', onRoute);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (armed) setArmed(false);
      else closeSheet();
    }
  });

  paint();
}
