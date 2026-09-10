export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const sum   = (arr, f = x => x) => arr.reduce((a, b) => a + (Number(f(b)) || 0), 0);
export const round = (v, d = 0) => { const m = 10 ** d; return Math.round((Number(v) || 0) * m) / m; };
export const num   = (v, dflt = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : dflt; };

/* ── 날짜 ─────────────────────────────────────────────── */
export const ymd = (d = new Date()) => {
  const x = (d instanceof Date) ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const today = () => ymd(new Date());
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

const DOW = ['일','월','화','수','목','금','토'];
export const dow = (s) => DOW[parseYmd(s).getDay()];

/** 월요일 시작 주의 첫날 */
export const weekStart = (s = today()) => {
  const d = parseYmd(s);
  const shift = (d.getDay() + 6) % 7;
  return addDays(s, -shift);
};
/** 최근 n일 날짜 배열 (오래된 → 최신) */
export const lastDays = (n, end = today()) =>
  Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));

export function fmtDate(s){
  const t = today();
  if (s === t) return '오늘';
  if (s === addDays(t, -1)) return '어제';
  if (s === addDays(t, 1)) return '내일';
  const d = parseYmd(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow(s)})`;
}
export const fmtDateShort = (s) => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };

/* ── 문자열 ───────────────────────────────────────────── */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export const nf = (v) => (Math.round(Number(v) || 0)).toLocaleString('ko-KR');

/** 볼륨을 읽기 쉬운 단위로 (12,500kg → 12.5t) */
export const fmtVolume = (kg) => kg >= 10000 ? `${round(kg / 1000, 1)}t` : `${nf(kg)}kg`;

/* ── DOM ──────────────────────────────────────────────── */
export function html(strings, ...vals){
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? (vals[i] ?? '') : ''), '');
}

export function toast(msg){
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1500);
  setTimeout(() => el.remove(), 1800);
}

/** 바텀시트 열기. render(close) → HTML 문자열, onMount(root, close) */
export function openSheet({ title, body, onMount, onClose }){
  const root = $('#sheet-root');
  root.innerHTML = html`
    <div class="sheet-back"></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      ${title ? `<h2>${esc(title)}</h2>` : ''}
      <div class="sheet-body">${body || ''}</div>
    </div>`;
  document.body.style.overflow = 'hidden';

  const close = () => {
    root.innerHTML = '';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  $('.sheet-back', root).addEventListener('click', close);
  onMount?.($('.sheet', root), close);
  return close;
}

export function confirmSheet(message, onYes, yesLabel = '삭제'){
  openSheet({
    title: message,
    body: html`
      <div class="row" style="gap:8px">
        <button class="btn grow" data-no>취소</button>
        <button class="btn grow danger" data-yes>${esc(yesLabel)}</button>
      </div>`,
    onMount(root, close){
      $('[data-no]', root).onclick = close;
      $('[data-yes]', root).onclick = () => { close(); onYes(); };
    },
  });
}

export const ICON = {
  plus:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x:     '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>',
  left:  '<svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M10 6l6 6-6 6"/></svg>',
  cal:   '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  copy:  '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
};
