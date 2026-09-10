import { esc, nf, round, fmtDateShort } from './utils.js';

/** 막대 위 직접 라벨용 짧은 표기 (1,428 → 1.4k) */
const compact = (v) => v >= 10000 ? `${round(v / 1000)}k`
  : v >= 1000 ? `${round(v / 1000, 1)}k` : String(Math.round(v));

/* 모든 차트는 인라인 SVG. 단일 계열은 범례 없이 제목이 계열을 설명하고,
 * 값은 직접 라벨과 <title> 툴팁 양쪽으로 노출한다. */

/** 도넛 링: 하나의 진행률을 보여주는 히어로 숫자 */
export function ring({ value, max, size = 104, stroke = 11, color = 'var(--c-mark)', center }){
  const pct = max > 0 ? Math.min(value / max, 1.35) : 0;
  const r = (size - stroke) / 2;
  const cx = size / 2, C = 2 * Math.PI * r;
  const over = pct > 1;
  const dash = C * Math.min(pct, 1);
  return `
  <svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img"
       aria-label="목표 ${nf(max)} 중 ${nf(value)} 달성">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--grid)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none"
            stroke="${over ? 'var(--amber)' : color}" stroke-width="${stroke}" stroke-linecap="round"
            stroke-dasharray="${dash} ${C}" transform="rotate(-90 ${cx} ${cx})"/>
    ${center ? `<foreignObject x="0" y="0" width="${size}" height="${size}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="height:${size}px;display:flex;align-items:center;justify-content:center">
        ${center}</div></foreignObject>` : ''}
  </svg>`;
}

/** 세로 막대 + 목표 기준선. data: [{label, value, sub}] */
export function barsWithTarget({ data, target, unit = 'kcal', height = 128, labelEvery = 1 }){
  const W = 320, H = height, padL = 6, padR = 6, padT = 18, padB = 18;
  const n = data.length || 1;
  const max = Math.max(target || 0, ...data.map(d => d.value), 1) * 1.15;
  const bw = (W - padL - padR) / n;
  const gap = Math.min(8, bw * 0.28);
  const y = v => padT + (H - padT - padB) * (1 - v / max);

  const bars = data.map((d, i) => {
    const x = padL + i * bw + gap / 2;
    const w = bw - gap;
    const top = d.value > 0 ? y(d.value) : H - padB;
    const h = Math.max(d.value > 0 ? 3 : 0, H - padB - top);
    const dim = d.value === 0;
    return `<g>
      <rect class="mark ${dim ? 'dim' : ''}" x="${round(x,1)}" y="${round(top,1)}" width="${round(w,1)}" height="${round(h,1)}" rx="4">
        <title>${esc(d.label)}: ${nf(d.value)}${unit}</title></rect>
      ${d.value > 0 && i % labelEvery === 0
        ? `<text class="val" x="${round(x + w/2,1)}" y="${round(top - 5,1)}" text-anchor="middle">${n >= 6 ? compact(d.value) : nf(d.value)}</text>` : ''}
      <text x="${round(x + w/2,1)}" y="${H - 5}" text-anchor="middle">${esc(d.sub ?? d.label)}</text>
    </g>`;
  }).join('');

  const ref = target ? `
    <line class="ref" x1="${padL}" x2="${W - padR}" y1="${round(y(target),1)}" y2="${round(y(target),1)}"/>
    <text x="${W - padR}" y="${round(y(target) - 4,1)}" text-anchor="end">목표 ${nf(target)}</text>` : '';

  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="일자별 ${unit} 막대 그래프">
    ${ref}${bars}</svg></div>`;
}

/** 가로 막대: 부위별 세트 수처럼 항목이 적고 이름이 긴 경우 */
export function hBars({ data, target, unit = '세트', rowH = 26 }){
  const W = 320, padL = 52, padR = 34;
  const H = data.length * rowH + 8;
  const max = Math.max(target || 0, ...data.map(d => d.value), 1) * 1.1;
  const bw = W - padL - padR;
  const rows = data.map((d, i) => {
    const yy = i * rowH + 4;
    const w = Math.max(d.value > 0 ? 3 : 0, bw * d.value / max);
    return `<g>
      <text x="${padL - 8}" y="${yy + rowH/2 + 1}" text-anchor="end" dominant-baseline="middle">${esc(d.label)}</text>
      <rect class="mark ${d.value === 0 ? 'dim' : ''}" x="${padL}" y="${yy + 4}" width="${round(w,1)}" height="${rowH - 12}" rx="4">
        <title>${esc(d.label)}: ${d.value}${unit}</title></rect>
      <text class="val" x="${round(padL + w + 6,1)}" y="${yy + rowH/2 + 1}" dominant-baseline="middle">${d.value}</text>
    </g>`;
  }).join('');
  const ref = target ? `<line class="ref" y1="2" y2="${H - 4}"
      x1="${round(padL + bw * target / max,1)}" x2="${round(padL + bw * target / max,1)}"/>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="부위별 ${unit} 막대 그래프">
    ${ref}${rows}</svg></div>`;
}

/** 꺾은선: 체중 추세. points: [{date, value}] */
export function lineChart({ points, height = 130, unit = 'kg', trendPerWeek = null }){
  if (points.length < 2){
    return `<div class="empty">점이 2개 이상이어야 추세를 그릴 수 있습니다.</div>`;
  }
  const W = 320, H = height, padL = 32, padR = 12, padT = 14, padB = 20;
  const vs = points.map(p => p.value);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1){ const m = (hi + lo) / 2; lo = m - 0.6; hi = m + 0.6; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => padL + (W - padL - padR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const y = v => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${round(x(i),1)} ${round(y(p.value),1)}`).join(' ');
  const step = Math.max(1, Math.ceil(points.length / 6));
  const dots = points.map((p, i) => `
    <circle class="dot" cx="${round(x(i),1)}" cy="${round(y(p.value),1)}" r="${points.length > 20 ? 3 : 4.5}">
      <title>${esc(fmtDateShort(p.date))}: ${p.value}${unit}</title></circle>`).join('');
  const xlab = points.map((p, i) => (i % step === 0 || i === points.length - 1)
    ? `<text x="${round(x(i),1)}" y="${H - 5}" text-anchor="middle">${fmtDateShort(p.date)}</text>` : '').join('');

  // 추세선
  let trend = '';
  if (trendPerWeek !== null && points.length >= 3){
    const first = points[0].value;
    const perDay = trendPerWeek / 7;
    const endV = first + perDay * ((new Date(points.at(-1).date) - new Date(points[0].date)) / 86400000);
    trend = `<line class="trend" x1="${round(x(0),1)}" y1="${round(y(first),1)}" x2="${round(x(points.length-1),1)}" y2="${round(y(endV),1)}"/>`;
  }

  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="체중 변화 추이">
    <line class="grid" x1="${padL}" x2="${W - padR}" y1="${padT}" y2="${padT}"/>
    <line class="grid" x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}"/>
    <text x="${padL - 5}" y="${padT + 4}" text-anchor="end">${round(hi,1)}</text>
    <text x="${padL - 5}" y="${H - padB + 4}" text-anchor="end">${round(lo,1)}</text>
    ${trend}<path class="lineseries" d="${d}"/>${dots}${xlab}</svg></div>`;
}

/** 매크로 3종 진행 막대 (계열이 3개라 범례 + 직접 라벨을 함께 둔다) */
export function macroBars({ carb, protein, fat, target }){
  const rows = [
    { key: 'carb',    name: '탄수화물', v: carb,    t: target.carb,    color: 'var(--c-carb)' },
    { key: 'protein', name: '단백질',   v: protein, t: target.protein, color: 'var(--c-protein)' },
    { key: 'fat',     name: '지방',     v: fat,     t: target.fat,     color: 'var(--c-fat)' },
  ];
  return `<div class="macro">${rows.map(r => {
    const pct = r.t > 0 ? Math.min(r.v / r.t, 1) * 100 : 0;
    return `<div class="macro-line">
      <div class="row between">
        <span class="nm"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${r.color};margin-right:6px"></i>${r.name}</span>
        <span class="vl">${nf(r.v)} / ${nf(r.t)}g</span>
      </div>
      <div class="bar"><i style="width:${round(pct,1)}%;background:${r.color}"></i></div>
    </div>`;
  }).join('')}</div>`;
}

/** 접히는 데이터 표 (색만으로 정보를 전달하지 않기 위한 대체 경로) */
export function tableView(headers, rows){
  return `<details class="tbl"><summary></summary>
    <table class="tblview"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></details>`;
}
