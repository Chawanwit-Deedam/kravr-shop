/* =========================================================
   Kumo — GSAP-driven interactions
   One cup, five real drinks: tap a thumbnail and the cup's photo
   cross-fades while the copy updates. Entrance timeline, cup tilt
   parallax, scroll reveals, and a Photo / Illustration toggle.
   Degrades gracefully if GSAP fails to load.
   ========================================================= */
"use strict";

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";

  const FLAVORS = {
    matcha: { name: "Iced Matcha Latte", desc: "Stone-ground ceremonial matcha over cold oat milk. Grassy, vivid, quietly sweet." },
    latte: { name: "Iced Latte", desc: "Slow-pulled espresso, cold oat milk, and a whisper of sweetness." },
    americano: { name: "Iced Americano", desc: "Two shots over ice and water. Clean, bold, nothing to hide." },
    chocolate: { name: "Iced Chocolate", desc: "Dark cocoa folded into cold milk — dessert you can drink." },
    lemon: { name: "Iced Lemon Soda", desc: "Sparkling water, fresh lemon, and a bright little lift." },
  };

  const cards = $$(".fcard");
  const imgs = $$(".product__img");
  const pimgs = {}; imgs.forEach((im) => { pimgs[im.dataset.pimg] = im; });
  const nameEl = $("[data-readout-name]");
  const descEl = $("[data-readout-desc]");
  const badge = $("[data-product-badge]");
  const svgDrink = $$(".product__svg .kcup__matcha, .product__svg .kcup__leaf");
  const svgFoam = $$(".product__svg .kcup__foam");

  /* ---------- Drink switching: same cup, the photo cross-fades ---------- */
  function selectFlavor(card) {
    cards.forEach((c) => { const on = c === card; c.classList.toggle("is-active", on); c.setAttribute("aria-selected", String(on)); });
    const { color, flavor } = card.dataset;
    const f = FLAVORS[flavor] || FLAVORS.matcha;
    const next = pimgs[flavor];
    if (next) imgs.forEach((im) => im.classList.toggle("is-active", im === next));
    svgDrink.forEach((e) => { e.style.fill = color; });
    svgFoam.forEach((e) => { e.style.fill = "#ece3cf"; });
    if (badge) badge.textContent = f.name;
    if (hasGsap) {
      gsap.to("[data-readout]", {
        opacity: 0, y: 8, duration: 0.18,
        onComplete() { nameEl.textContent = f.name; descEl.textContent = f.desc; gsap.to("[data-readout]", { opacity: 1, y: 0, duration: 0.36, ease: "power3.out" }); },
      });
    } else { nameEl.textContent = f.name; descEl.textContent = f.desc; }
  }
  cards.forEach((c) => c.addEventListener("click", () => selectFlavor(c)));

  /* ---------- Photo / Illustration toggle ---------- */
  const productEl = $("[data-product]");
  $$("[data-view-btn]").forEach((b) => b.addEventListener("click", () => {
    if (productEl) productEl.setAttribute("data-view", b.dataset.viewBtn);
    $$("[data-view-btn]").forEach((x) => { const on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-selected", String(on)); });
  }));

  /* ---------- Deep links: ?f=latte, ?view=svg ---------- */
  const params = new URLSearchParams(location.search);
  const fParam = params.get("f");
  if (fParam) { const pre = cards.find((c) => c.dataset.flavor === fParam); if (pre) selectFlavor(pre); }
  if (params.get("view") === "svg") { const b = $('[data-view-btn="svg"]'); if (b) b.click(); }

  /* ---------- Nav shrink on scroll ---------- */
  const nav = $("[data-nav]");
  const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Toast (buy button) ---------- */
  const toast = $("[data-toast]");
  let toastT = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => { toast.classList.remove("is-show"); setTimeout(() => { toast.hidden = true; }, 300); }, 2200);
  }
  const buy = $("[data-buy]");
  if (buy) buy.addEventListener("click", () => showToast("Added to your order — demo only"));

  /* ---------- GSAP motion ---------- */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  $$("[data-reveal]").forEach((el) => {
    gsap.from(el, { opacity: 0, y: reduced ? 0 : 44, duration: reduced ? 0.01 : 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%" } });
  });
  $$("[data-step]").forEach((el) => {
    gsap.from(el, { opacity: 0, y: reduced ? 0 : 56, duration: reduced ? 0.01 : 0.85, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  const still = params.has("still");
  if (reduced || still) return;

  // Hero entrance (all .from so elements always settle visible)
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from("[data-hero-line]", { opacity: 0, y: 48, duration: 1, stagger: 0.1 }, 0.1)
    .from(".hero__eyebrow", { opacity: 0, y: 16, duration: 0.7 }, 0.15)
    .from(".hero__tagline", { opacity: 0, y: 14, duration: 0.7 }, 0.3)
    .from(".product", { opacity: 0, scale: 0.7, y: 40, duration: 1.1, ease: "back.out(1.3)" }, "-=0.45")
    .from(".fcard", { opacity: 0, y: 24, scale: 0.92, duration: 0.6, stagger: 0.08 }, "-=0.7")
    .from("[data-readout]", { opacity: 0, y: 16, duration: 0.6 }, "-=0.7")
    .from(".hero__cue", { opacity: 0, y: 10, duration: 0.6 }, "-=0.4");

  // Desktop cup tilt parallax
  const mm = gsap.matchMedia();
  mm.add("(min-width: 821px)", () => {
    const floats = cards.map((c) => gsap.to(c, { y: "+=14", duration: 3 + Math.random(), ease: "sine.inOut", repeat: -1, yoyo: true, delay: Math.random() }));
    const stage = $("[data-stage]");
    const move = (e) => {
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(".product", { rotationY: dx * 12, rotationX: -dy * 9, x: dx * 14, duration: 0.6, ease: "power3.out", overwrite: "auto", transformPerspective: 900 });
      gsap.to(cards, { x: -dx * 30, duration: 0.9, ease: "power3.out", overwrite: "auto" });
    };
    const reset = () => { gsap.to(".product", { rotationY: 0, rotationX: 0, x: 0, duration: 0.9, ease: "power3.out" }); gsap.to(cards, { x: 0, duration: 0.9 }); };
    stage.addEventListener("mousemove", move);
    stage.addEventListener("mouseleave", reset);
    return () => { floats.forEach((t) => t.kill()); stage.removeEventListener("mousemove", move); stage.removeEventListener("mouseleave", reset); };
  });

  // Aura drift on scroll
  gsap.to("[data-aura]", { yPercent: 30, scale: 1.15, ease: "none", scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true } });
})();
