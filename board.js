/* ==========================================================================
   Animated pixel-art PCB background
   Draws a seeded circuit board on <canvas id="bg"> with pulses, LEDs and
   pointer interaction. Used by index.html and cv.html.
   Written for this site (see CREDITS.md). No external dependencies.
   ========================================================================== */
(() => {
  'use strict';
  const G = 4;                       // logical pixels per grid cell
  const S = 3;                       // CSS pixels per logical pixel
  const DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const C = {
    bg: '#08120d', dot: '#0c1b14', trace: '#1b4d34', via: '#7d6b2f',
    pad: '#a88b3a', padHot: '#ffd866', chipBody: '#0f1b15', chipEdge: '#2a4a3a',
    silk: '#5f8a73', hot: '#5dffb0', glow: '#4fe39c', pulse: '#7dffc4', head: '#eafff4',
    r: '#6e5f3f', c: '#8a6b2e', rHot: '#e8d18a', ledOff: '#26372e', hole: '#050a08'
  };
  const LED_COLORS = ['#ff5d5d', '#6dff8a', '#ffc14d', '#5db7ff'];

  // 3x5 silkscreen font
  const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', 'U': '101101101101111', 'R': '110101110101101',
    'C': '111100100100111', 'L': '100100100100111', 'E': '111100110100111', 'D': '110101101101110'
  };

  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const toggle = document.getElementById('toggle');

  // "animate" = the PULSES button. When ON, pulses and blinking LEDs run, but only while the
  // visitor is active (pointer moving). When idle the page draws one still image and the
  // render loop stops completely, so there is no redrawing at 60 fps (saves battery).
  let animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACTIVE_MS = 1500;            // keep animating this long after the last pointer movement
  let W, H, cols, rows, occ, board, comps, traces, leds;
  let pulses = [];
  let hover = null;
  const mouse = { x: 0, y: 0, on: false };
  let last = performance.now(), spawnT = 0, hoverT = 0;
  let running = false, activeUntil = 0;

  function mulberry(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function drawText(g, s, x, y, color) {
    g.fillStyle = color;
    for (const ch of s) {
      const bits = FONT[ch];
      if (bits) for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(x + i % 3, y + (i / 3 | 0), 1, 1);
      x += 4;
    }
  }

  function line(a, b, out, skipFirst) {
    let [x0, y0] = a; const [x1, y1] = b;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, first = true;
    for (;;) {
      if (!(first && skipFirst)) out.push(x0, y0);
      first = false;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function build() {
    W = Math.ceil(innerWidth / S);
    H = Math.ceil(innerHeight / S);
    canvas.width = W; canvas.height = H;
    cols = Math.ceil(W / G); rows = Math.ceil(H / G);
    occ = new Uint8Array(cols * rows);
    comps = []; traces = []; leds = []; pulses = []; hover = null;
    const R = mulberry(20261114);

    const inb = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
    const free = (x, y) => inb(x, y) && !occ[y * cols + x];
    const mark = (x, y) => { if (inb(x, y)) occ[y * cols + x] = 1; };
    const fill = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) mark(x + i, y + j); };
    const rectFree = (x, y, w, h, m) => {
      for (let j = y - m; j < y + h + m; j++) for (let i = x - m; i < x + w + m; i++) if (!free(i, j)) return false;
      return true;
    };
    const place = (w, h, m) => {
      const rx = cols - w - 4, ry = rows - h - 4;
      if (rx <= 0 || ry <= 0) return null;
      for (let t = 0; t < 80; t++) {
        const x = 2 + Math.floor(R() * rx), y = 2 + Math.floor(R() * ry);
        if (rectFree(x, y, w, h, m)) { fill(x, y, w, h); return { x, y, w, h }; }
      }
      return null;
    };
    const add = (c) => { c.id = comps.length; c.pins = c.pins || []; c.traces = []; comps.push(c); return c; };

    // mounting holes in the corners
    [[2, 2], [cols - 5, 2], [2, rows - 5], [cols - 5, rows - 5]].forEach(([x, y]) => {
      fill(x - 1, y - 1, 5, 5);
      add({ type: 'hole', x, y, w: 3, h: 3 });
    });

    // ICs
    const nChips = Math.max(4, Math.min(16, Math.round(cols * rows / 650)));
    let u = 1;
    for (let k = 0; k < nChips; k++) {
      const w = 5 + 2 * Math.floor(R() * 4), h = 5 + 2 * Math.floor(R() * 3);
      const p = place(w, h, 2); if (!p) continue;
      const c = add({ type: 'chip', ...p, label: 'U' + (u++) });
      for (let i = 1; i <= w - 2; i += 2) {
        c.pins.push({ x: p.x + i, y: p.y, dir: 6 }, { x: p.x + i, y: p.y + h - 1, dir: 2 });
      }
      for (let j = 1; j <= h - 2; j += 2) {
        c.pins.push({ x: p.x, y: p.y + j, dir: 4 }, { x: p.x + w - 1, y: p.y + j, dir: 0 });
      }
    }
    // passives and LEDs (4x1 cells, horizontal or vertical)
    const mkTwoPin = (type, extra) => {
      const horiz = R() < 0.5;
      const w = horiz ? 4 : 1, h = horiz ? 1 : 4;
      const p = place(w, h, 1); if (!p) return;
      const c = add({ type, horiz, ...p, ...extra });
      c.pins = horiz
        ? [{ x: p.x, y: p.y, dir: 4 }, { x: p.x + 3, y: p.y, dir: 0 }]
        : [{ x: p.x, y: p.y, dir: 6 }, { x: p.x, y: p.y + 3, dir: 2 }];
      if (type === 'led') leds.push(c);
    };
    for (let k = 0; k < nChips * 3; k++) mkTwoPin(R() < 0.6 ? 'r' : 'c', {});
    for (let k = 0; k < Math.max(3, nChips >> 1); k++) {
      mkTwoPin('led', { color: LED_COLORS[Math.floor(R() * LED_COLORS.length)], period: 0.8 + R() * 1.8, off: R() });
    }

    // traces start at pins and wander on 45-degree steps without crossing
    const canStep = (x, y, d) => {
      if (!free(x + DX[d], y + DY[d])) return false;
      if (DX[d] && DY[d] && (!free(x + DX[d], y) || !free(x, y + DY[d]))) return false;
      return true;
    };
    const allPins = [];
    comps.forEach(c => c.pins.forEach(p => allPins.push([c, p])));
    for (let i = allPins.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [allPins[i], allPins[j]] = [allPins[j], allPins[i]]; }

    for (const [c, p] of allPins) {
      if (c.type === 'chip' && R() < 0.2) continue;
      let x = p.x, y = p.y, d = p.dir, len = 0;
      const maxLen = 14 + Math.floor(R() * 50);
      const pts = [[x, y]];
      while (len < maxLen) {
        const seg = (d & 1) ? 1 + Math.floor(R() * 3) : 3 + Math.floor(R() * 8);
        let moved = 0;
        for (let i = 0; i < seg && len < maxLen; i++) {
          if (!canStep(x, y, d)) break;
          x += DX[d]; y += DY[d]; mark(x, y); len++; moved++;
        }
        if (moved) pts.push([x, y]);
        const opts = R() < 0.5 ? [1, -1] : [-1, 1];
        let turned = false;
        for (const t of opts) { const nd = (d + t + 8) % 8; if (canStep(x, y, nd)) { d = nd; turned = true; break; } }
        if (!turned) break;
      }
      if (len < 3) continue;
      const path = [];
      const px = pts.map(([a, b]) => [a * G + 2, b * G + 2]);
      for (let i = 0; i < px.length - 1; i++) line(px[i], px[i + 1], path, i > 0);
      const tr = { comp: c, path, n: path.length / 2, end: px[px.length - 1], flash: 0 };
      traces.push(tr); c.traces.push(tr);
    }

    // static board layer
    board = document.createElement('canvas');
    board.width = W; board.height = H;
    const b = board.getContext('2d');
    b.fillStyle = C.bg; b.fillRect(0, 0, W, H);
    b.fillStyle = C.dot;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) b.fillRect(x * G + 2, y * G + 2, 1, 1);
    b.fillStyle = C.trace;
    for (const tr of traces) for (let i = 0; i < tr.path.length; i += 2) b.fillRect(tr.path[i], tr.path[i + 1], 1, 1);
    for (const tr of traces) {
      const [ex, ey] = tr.end;
      b.fillStyle = C.via; b.fillRect(ex - 1, ey - 1, 3, 3);
      b.fillStyle = C.bg; b.fillRect(ex, ey, 1, 1);
    }
    comps.forEach(c => drawComp(b, c, false));
  }

  function drawComp(g, c, hot) {
    if (c.type === 'hole') {
      const cx = c.x * G + 6, cy = c.y * G + 6;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= 5.5) { g.fillStyle = d < 3 ? C.hole : (hot ? C.padHot : C.pad); g.fillRect(cx + dx, cy + dy, 1, 1); }
      }
      return;
    }
    if (c.type === 'chip') {
      const bx = (c.x + 1) * G, by = (c.y + 1) * G, bw = (c.w - 2) * G, bh = (c.h - 2) * G;
      g.fillStyle = C.chipBody; g.fillRect(bx, by, bw, bh);
      g.fillStyle = hot ? C.hot : C.chipEdge;
      g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + bh - 1, bw, 1);
      g.fillRect(bx, by, 1, bh); g.fillRect(bx + bw - 1, by, 1, bh);
      g.fillStyle = hot ? C.hot : C.silk; g.fillRect(bx + 2, by + 2, 2, 2);
      const lw = c.label.length * 4 - 1;
      drawText(g, c.label, bx + ((bw - lw) >> 1), by + ((bh - 5) >> 1) + 1, hot ? C.hot : C.silk);
    } else {
      const bx = c.horiz ? (c.x + 1) * G : c.x * G + 1;
      const by = c.horiz ? c.y * G + 1 : (c.y + 1) * G;
      g.fillStyle = c.type === 'led' ? C.ledOff : (hot ? C.rHot : (c.type === 'r' ? C.r : C.c));
      g.fillRect(bx, by, c.horiz ? 2 * G : 3, c.horiz ? 3 : 2 * G);
    }
    g.fillStyle = hot ? C.padHot : C.pad;
    for (const p of c.pins) g.fillRect(p.x * G + 1, p.y * G + 1, 3, 3);
  }

  function ledBody(c) {
    return c.horiz ? [(c.x + 1) * G, c.y * G + 1, 2 * G, 3] : [c.x * G + 1, (c.y + 1) * G, 3, 2 * G];
  }

  function spawn(tr, speed) {
    if (pulses.length < 40) pulses.push({ tr, pos: 0, speed: speed || 30 + Math.random() * 45 });
  }

  // Draw the plain board once (no pulses, no glow, LEDs off)
  function drawStatic() {
    hover = null;
    ctx.globalAlpha = 1;
    ctx.drawImage(board, 0, 0);
  }

  // Start (or extend) the render loop for ms milliseconds of activity
  function wake(ms) {
    activeUntil = Math.max(activeUntil, performance.now() + ms);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const active = now < activeUntil;
    ctx.globalAlpha = 1;
    ctx.drawImage(board, 0, 0);

    // find the component nearest to the pointer
    hover = null;
    if (mouse.on) {
      let best = 30;
      for (const c of comps) {
        const dx = Math.max(c.x * G - mouse.x, 0, mouse.x - (c.x + c.w) * G);
        const dy = Math.max(c.y * G - mouse.y, 0, mouse.y - (c.y + c.h) * G);
        const d = Math.hypot(dx, dy);
        if (d < best) { best = d; hover = c; }
      }
    }

    // proximity glow on traces near the pointer
    if (mouse.on) {
      const R = 40, R2 = R * R;
      ctx.fillStyle = C.glow;
      for (const tr of traces) {
        const p = tr.path;
        for (let i = 0; i < p.length; i += 2) {
          const dx = p[i] - mouse.x, dy = p[i + 1] - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) { ctx.globalAlpha = (1 - d2 / R2) * 0.55; ctx.fillRect(p[i], p[i + 1], 1, 1); }
        }
      }
      ctx.globalAlpha = 1;
    }

    // hovered component: lit body, pads and all its traces
    if (hover) {
      ctx.fillStyle = C.hot; ctx.globalAlpha = 0.85;
      for (const tr of hover.traces) for (let i = 0; i < tr.path.length; i += 2) ctx.fillRect(tr.path[i], tr.path[i + 1], 1, 1);
      ctx.globalAlpha = 1;
      drawComp(ctx, hover, true);
    }

    // LEDs
    for (const c of leds) {
      const on = hover === c || (animate && active && ((now / 1000 / c.period + c.off) % 1) < 0.5);
      if (!on) continue;
      const [bx, by, bw, bh] = ledBody(c);
      ctx.globalAlpha = 0.22; ctx.fillStyle = c.color; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.globalAlpha = 1; ctx.fillRect(bx, by, bw, bh);
    }

    // pulses (new ones only while the visitor is active)
    if (animate && active) {
      spawnT -= dt;
      if (spawnT <= 0 && traces.length) { spawn(traces[Math.floor(Math.random() * traces.length)]); spawnT = 0.1 + Math.random() * 0.2; }
      if (hover && hover.traces.length) {
        hoverT -= dt;
        if (hoverT <= 0) { spawn(hover.traces[Math.floor(Math.random() * hover.traces.length)], 70); hoverT = 0.09; }
      }
    }
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k];
      p.pos += p.speed * dt * (active ? 1 : 4);   // once the visitor stops, leftover pulses finish quickly
      const head = Math.min(p.tr.n - 1, Math.floor(p.pos));
      for (let t = 0; t < 10; t++) {
        const i = head - t; if (i < 0) break;
        ctx.globalAlpha = (1 - t / 10) * 0.9;
        ctx.fillStyle = t === 0 ? C.head : C.pulse;
        if (t === 0) ctx.fillRect(p.tr.path[2 * i], p.tr.path[2 * i + 1], 2, 2);
        else ctx.fillRect(p.tr.path[2 * i], p.tr.path[2 * i + 1], 1, 1);
      }
      if (p.pos >= p.tr.n) { p.tr.flash = 1; pulses.splice(k, 1); }
    }
    ctx.globalAlpha = 1;
    for (const tr of traces) {
      if (tr.flash > 0) {
        ctx.globalAlpha = tr.flash; ctx.fillStyle = C.padHot;
        ctx.fillRect(tr.end[0] - 1, tr.end[1] - 1, 3, 3);
        tr.flash -= dt * 2.5;
      }
    }
    ctx.globalAlpha = 1;

    // Keep looping only while something is moving; otherwise stop and show the still board
    const busy = active || pulses.length > 0 || traces.some(t => t.flash > 0);
    if (busy) requestAnimationFrame(frame);
    else { running = false; drawStatic(); }
  }

  // input (every interaction wakes the render loop for a short while)
  addEventListener('pointermove', e => {
    mouse.x = e.clientX * W / innerWidth; mouse.y = e.clientY * H / innerHeight; mouse.on = true;
    wake(ACTIVE_MS);
  }, { passive: true });
  addEventListener('pointerdown', () => wake(ACTIVE_MS), { passive: true });
  addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') setTimeout(() => { mouse.on = false; wake(150); }, 900);
  });
  document.documentElement.addEventListener('mouseleave', () => { mouse.on = false; wake(150); });
  addEventListener('click', e => {
    if (!animate || e.target.closest('a,button') || !hover) return;
    for (const tr of hover.traces) spawn(tr, 80);
    wake(ACTIVE_MS);
  });

  function syncToggle() {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(animate));
    toggle.textContent = 'PULSES: ' + (animate ? 'ON' : 'OFF');
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      animate = !animate;
      if (!animate) pulses = [];
      syncToggle();
      wake(animate ? ACTIVE_MS : 150);   // brief preview when turned on; clean redraw when turned off
    });
    syncToggle();
  }

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); if (!running) drawStatic(); }, 150);
  });

  build();
  drawStatic();                          // one still image; no loop until the visitor interacts
})();
