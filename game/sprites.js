// 눈보라 벌목장 — 이미지 스프라이트 로더. assets/sprites.json에 적힌 PNG가 있으면 벡터 그림 대신 그린다.
// 파일이 없거나 읽지 못하면 조용히 무시하고 기존 벡터 그림을 쓴다.
'use strict';

const Sprites = {
  map: {},   // key → { img, fw, fh, anims, fps, anchorX, anchorY, scale, flip }
  load(url) {
    if (typeof fetch === 'undefined') return;
    fetch(url).then(r => (r.ok ? r.json() : null)).then(manifest => {
      if (!manifest) return;
      const base = url.slice(0, url.lastIndexOf('/') + 1);
      for (const [key, def] of Object.entries(manifest)) {
        if (!def || !def.file) continue;
        const img = new Image();
        img.onload = () => { this.map[key] = Object.assign({ fw: img.width, fh: img.height, anims: { idle: [0] }, fps: 8, anchorX: 0.5, anchorY: 1, scale: 1, flip: true }, def, { img }); };
        img.onerror = () => {};
        img.src = base + def.file;
      }
    }).catch(() => {});
  },
  // 그렸으면 true. state: idle | walk | work | attack | down. t: 걷기 위상, now: 게임 시간
  draw(ctx, key, state, t, now, x, y, facing, scale) {
    const s = this.map[key];
    if (!s) return false;
    const frames = s.anims[state] || s.anims.idle || [0];
    const fi = frames[Math.floor((state === 'walk' ? t * s.fps / 11 : now * s.fps)) % frames.length];
    const cols = Math.max(1, Math.floor(s.img.width / s.fw));
    const sx = (fi % cols) * s.fw, sy = Math.floor(fi / cols) * s.fh;
    const w = s.fw * s.scale * (scale || 1), h = s.fh * s.scale * (scale || 1);
    ctx.save(); ctx.translate(x, y);
    if (s.flip && facing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = s.smooth !== false;
    ctx.drawImage(s.img, sx, sy, s.fw, s.fh, -w * s.anchorX, -h * s.anchorY, w, h);
    ctx.restore();
    return true;
  },
};
