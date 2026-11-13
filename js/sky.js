// Небо за анкетой: камера медленно летит сквозь блёстки и размытые розовые огни. Когда анкета переходит к следующему
// кадру, камера делает рывок вперёд (или назад) и блёстки вытягиваются в штрихи. Один canvas, без библиотек.
// При «уменьшить движение» в настройках системы рисуется один неподвижный кадр.

export function createSky(canvas) {
  const ctx = canvas.getContext("2d");
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BASE = 0.014;                 // обычная скорость полёта, в долях глубины за секунду
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0;
  let boost = 0;                      // добавка к скорости от рывка, сама затухает
  let px = 0, py = 0, tx = 0, ty = 0; // сдвиг от указателя: сцена чуть поворачивается за мышью
  const stars = [], lights = [];

  // размытый огонёк рисуется один раз и потом только масштабируется
  function sprite(inner, outer) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.55, outer); gr.addColorStop(0.8, outer.replace(/[\d.]+\)$/, "0.12)")); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return c;
  }
  const SPR = [sprite("rgba(255,143,192,0.55)", "rgba(226,61,139,0.34)"), sprite("rgba(255,214,232,0.5)", "rgba(255,120,180,0.28)"), sprite("rgba(190,60,140,0.5)", "rgba(120,20,90,0.3)")];

  const newStar = (z) => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: z === undefined ? rnd(0.06, 1) : z, s: rnd(0.7, 1.9), tw: rnd(0, 6.28), ts: rnd(0.6, 2.2), spark: Math.random() < 0.34, pink: Math.random() < 0.45, lx: null, ly: null });
  const newLight = () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.05, 0.17), a: rnd(0.14, 0.34), vx: rnd(-0.004, 0.004), vy: rnd(-0.012, -0.003), k: Math.floor(rnd(0, 3)), d: rnd(0.4, 1.4) });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    const n = Math.round(Math.min(170, Math.max(60, w * h / 8500)));
    while (stars.length < n) stars.push(newStar()); stars.length = n;
    const m = w < 700 ? 8 : 13;
    while (lights.length < m) lights.push(newLight()); lights.length = m;
    if (still) draw(0, 0);
  }

  function sparkle(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.14, y - r * 0.14, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.14, y + r * 0.14, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.14, y + r * 0.14, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.14, y - r * 0.14, x, y - r);
    ctx.fill();
  }

  function draw(dt, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const v = BASE + boost, cx = w / 2 - px * 46, cy = h / 2 - py * 34, f = Math.max(w, h) * 0.3;

    // огни: дальние и ближние, ближние сильнее сдвигаются за мышью и при рывке
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) {
      l.x += l.vx * dt; l.y += (l.vy - boost * 0.22 * l.d) * dt;
      if (l.y < -0.25) { l.y = 1.25; l.x = rnd(0, 1); } else if (l.y > 1.3) { l.y = -0.2; l.x = rnd(0, 1); }
      if (l.x < -0.25) l.x = 1.2; else if (l.x > 1.25) l.x = -0.2;
      const r = l.r * Math.max(w, h) * 0.9, x = l.x * w - px * 90 * l.d, y = l.y * h - py * 60 * l.d;
      ctx.globalAlpha = l.a;
      ctx.drawImage(SPR[l.k], x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";

    const fast = Math.abs(boost) > 0.18;
    for (const s of stars) {
      s.z -= v * dt;
      if (s.z < 0.035) { Object.assign(s, newStar(1)); }
      else if (s.z > 1.05) { Object.assign(s, newStar(0.05)); }
      const sx = cx + s.x * f / s.z, sy = cy + s.y * f / s.z;
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) {
        if (v >= 0) Object.assign(s, newStar(1)); else { s.lx = s.ly = null; }
        continue;
      }
      const near = 1 - s.z, tw = 0.7 + 0.3 * Math.sin(s.tw + t * s.ts);
      const r = s.s * (0.55 + near * 2.3), a = Math.min(1, 0.4 + near * 1.3) * tw;
      ctx.fillStyle = ctx.strokeStyle = s.pink ? "rgba(255,170,208," + a.toFixed(3) + ")" : "rgba(255,255,255," + a.toFixed(3) + ")";
      if (fast && s.lx !== null) {
        ctx.lineWidth = Math.max(0.6, r * 0.9); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.lx, s.ly); ctx.lineTo(sx, sy); ctx.stroke();
      } else if (s.spark) sparkle(sx, sy, r * 3.6 * tw);
      else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill(); }
      s.lx = sx; s.ly = sy;
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    boost *= Math.exp(-dt / 0.3);
    if (Math.abs(boost) < 0.002) boost = 0;
    px += (tx - px) * Math.min(1, dt * 2.5); py += (ty - py) * Math.min(1, dt * 2.5);
    draw(dt, now / 1000);
    raf = requestAnimationFrame(frame);
  }
  function run() { if (!still && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
  window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5; } }, { passive: true });
  resize(); run();

  return {
    // k = 1 — рывок вперёд на смене сцены, 0.3 — лёгкий толчок между вопросами, отрицательное — назад
    boost(k) { if (!still) boost = k * 1.5; },
  };
}
