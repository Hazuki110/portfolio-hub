document.documentElement.classList.add("js");

/* ---- ハンバーガー ---- */
const hamburger = document.querySelector(".hamburger");
const nav = document.getElementById("global-nav");

const toggleMenu = (open) => {
  hamburger.classList.toggle("is-open", open);
  nav.classList.toggle("is-open", open);
  hamburger.setAttribute("aria-expanded", String(open));
  hamburger.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
};

hamburger.addEventListener("click", () =>
  toggleMenu(!hamburger.classList.contains("is-open")),
);
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => toggleMenu(false)),
);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleMenu(false);
});

/* ---- オープニング終了(スクロールロック解除&要素削除) ---- */
const opening = document.querySelector(".opening");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const endOpening = () => {
  document.body.classList.remove("is-opening");
  if (opening) opening.remove();
};
reduceMotion ? endOpening() : setTimeout(endOpening, 2900);

/* ---- スクロールでふわっと表示 ---- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 },
);
document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

/* ---- 左ナビ:今いるセクションを光らせる ---- */
const navLinks = [...document.querySelectorAll(".left__nav a")];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) =>
        a.classList.toggle("is-active", a.hash === "#" + entry.target.id),
      );
    });
  },
  { rootMargin: "-40% 0px -55% 0px" },
);
document.querySelectorAll("main section").forEach((s) => sectionObserver.observe(s));

/* ---- スクロール量バー ---- */
const progressBar = document.querySelector(".progress span");
const updateProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? window.scrollY / max : 0;
  progressBar.style.transform = `scaleX(${p})`;
};
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

/* ---- ヒーロー動画:読み込めなければ隠す/動きを減らす設定なら止める ---- */
const heroVideo = document.querySelector(".hero__video");
if (heroVideo) {
  heroVideo.addEventListener("error", () => (heroVideo.style.display = "none"));
  if (reduceMotion) heroVideo.pause();
}

/* ---- メインビジュアル:流れる金の粒(マウスでよける) ---- */
(() => {
  const canvas = document.querySelector(".hero__canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  let w = 0,
    h = 0,
    t = 0,
    running = false;
  const mouse = { x: -9999, y: -9999 };
  let parts = [];

  const spawn = (p = {}) => {
    p.x = Math.random() * w;
    p.y = Math.random() * h;
    p.life = 80 + Math.random() * 200;
    p.v = 0.6 + Math.random() * 1.1;
    return p;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = w < 768 ? 220 : 520;
    parts = Array.from({ length: n }, (_, i) =>
      Object.assign(spawn(), { red: i % 9 === 0 }),
    );
  };

  const step = () => {
    // 背景は透明のまま、前の線だけを少しずつ消す(動画が透けて見える)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 0.9;
    for (const p of parts) {
      const a =
        (Math.sin(p.x * 0.0022 + t * 0.0004) +
          Math.cos(p.y * 0.0027 - t * 0.0003)) *
        Math.PI;
      let vx = Math.cos(a) * p.v;
      let vy = Math.sin(a) * p.v;
      const dx = p.x - mouse.x,
        dy = p.y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < 150) {
        const f = (1 - d / 150) * 3.5;
        vx += (dx / d) * f;
        vy += (dy / d) * f;
      }
      const nx = p.x + vx,
        ny = p.y + vy;
      ctx.strokeStyle = p.red ? "rgba(184,53,43,0.6)" : "rgba(201,169,110,0.5)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
      p.life--;
      if (p.life <= 0 || nx < 0 || nx > w || ny < 0 || ny > h) spawn(p);
    }
    t += 16;
  };

  const loop = () => {
    if (!running) return;
    step();
    requestAnimationFrame(loop);
  };
  const setRunning = (on) => {
    if (on && !running) {
      running = true;
      requestAnimationFrame(loop);
    } else if (!on) running = false;
  };

  resize();
  window.addEventListener("resize", resize);
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => {
    mouse.x = mouse.y = -9999;
  });

  if (reduceMotion) {
    for (let i = 0; i < 220; i++) step(); // 動かさず静止画として描くだけ
  } else {
    // 画面内にいる時・タブが見えている時だけ動かす
    let visible = true;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setRunning(visible && !document.hidden);
    }).observe(hero);
    document.addEventListener("visibilitychange", () =>
      setRunning(visible && !document.hidden),
    );
    setRunning(true);
  }
})();


/* ---- Welcome の文字を1文字ずつ動かす ---- */
document.querySelectorAll(".lead").forEach((el) => {
  const text = el.textContent.trim();
  el.setAttribute("aria-label", text); // 読み上げ用に元の文を残す
  el.innerHTML = [...text]
    .map((c, i) =>
      c === " "
        ? '<span aria-hidden="true">&nbsp;</span>'
        : `<span aria-hidden="true" style="--i:${i}">${c}</span>`,
    )
    .join("");
  revealObserver.observe(el);
});