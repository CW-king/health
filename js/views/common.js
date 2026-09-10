import { html, esc, ICON, fmtDate, addDays, today } from '../utils.js';

/** 날짜 이동 바. onChange(newDate) */
export function dateNav(date, id = 'datenav'){
  const isToday = date === today();
  return html`
  <div class="row between card tight" id="${id}" style="margin-bottom:12px">
    <button class="icon-btn" data-nav="-1" aria-label="이전 날">${ICON.left}</button>
    <div class="center grow">
      <b style="font-size:15px">${esc(fmtDate(date))}</b>
      <div class="tiny faint mono">${esc(date)}</div>
    </div>
    <button class="icon-btn" data-nav="1" aria-label="다음 날" ${isToday ? 'disabled style="opacity:.35"' : ''}>${ICON.right}</button>
  </div>`;
}

export function bindDateNav(root, date, onChange){
  root.querySelectorAll('[data-nav]').forEach(b => {
    b.onclick = () => {
      const next = addDays(date, Number(b.dataset.nav));
      if (next > today()) return;
      onChange(next);
    };
  });
}

export const emptyBox = (msg) => `<div class="empty">${msg}</div>`;

export const fab = (label = '추가') =>
  `<button class="fab" id="fab" aria-label="${esc(label)}">${ICON.plus}</button>`;
