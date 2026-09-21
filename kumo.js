/* =========================================================
   Kumo — GSAP-driven interactions
   One matcha cup: tap a fruit and its colour swirls into the cup
   while the label + price update. Entrance timeline, cup tilt
   parallax, and scroll reveals. Degrades gracefully without GSAP.
   ========================================================= */
"use strict";

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";

  const MATCHA = "#6f9445"; // default swirl / "Original"
  const PRICES = { raspberry: "20.90$", strawberry: "19.33$", blueberry: "21.40$", cranberry: "20.10$" };

  const fruits = $$(".fruit");
  const swirl = $(".cup__swirl");
  const matchaFill = $(".cup__matcha");
  const labelEl = $("[data-cup-label]");
  const priceEl = $("[data-price]");

  /* ---------- Fruit → the colour swirls into the cup ---------- */
  function selectFruit(card) {
    if (!card) return;
    fruits.forEach((f) => {
      const on = f === card;
      f.classList.toggle("is-active", on);
      f.setAttribute("aria-pressed", String(on));
    });
    const { color, label, fruit } = card.dataset;
    if (swirl) swirl.style.fill = color;
    if (labelEl) labelEl.textContent = label;
    if (priceEl && PRICES[fruit]) priceEl.textContent = PRICES[fruit];
    if (hasGsap && !reduced) {
      gsap.fromTo(".cup", { scale: 0.97 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
      gsap.fromTo(labelEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
    }
  }
  fruits.forEach((f) => {
    f.setAttribute("aria-pressed", "false");
    f.addEventListener("click", () => selectFruit(f));
  });

  /* Reset to plain matcha when nothing is picked (keeps "Original") */
  function resetCup() {
    if (swirl) swirl.style.fill = MATCHA;
    if (matchaFill) matchaFill.style.fill = MATCHA;
  }
  resetCup();

  /* ---------- Deep link: ?fruit=blueberry ---------- */
  const params = new URLSearchParams(location.search);
  const fParam = params.get("fruit");
  if (fParam) { const pre = fruits.find((c) => c.dataset.fruit === fParam); if (pre) selectFruit(pre); }

  /* ---------- Nav shrink on scroll ---------- */
  const nav = $("[data-nav]");
  const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Toast (buy buttons) ---------- */
  const toast = $("[data-toast]");
  let toastT = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => { toast.classList.remove("is-show"); setTimeout(() => { toast.hidden = true; }, 300); }, 2200);
  }
  $$("[data-buy]").forEach((b) => b.addEventListener("click", () => {
    const picked = $(".fruit.is-active");
    const name = picked ? picked.dataset.label + " matcha" : "matcha tea";
    showToast("Added " + name + " — demo only");
  }));

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
  tl.from(".hero__eyebrow", { opacity: 0, y: 16, duration: 0.7 }, 0.1)
    .from(".mound", { opacity: 0, y: 30, duration: 0.9 }, 0.2)
    .from(".cup", { opacity: 0, scale: 0.7, y: 44, duration: 1.1, ease: "back.out(1.3)" }, 0.3)
    .from(".buy", { opacity: 0, y: 14, duration: 0.6 }, "-=0.5")
    .from(".fruit", { opacity: 0, scale: 0.6, duration: 0.6, stagger: 0.08, ease: "back.out(1.5)", clearProps: "opacity,scale" }, "-=0.7")
    .from("[data-hero-line]", { opacity: 0, y: 40, duration: 0.9, stagger: 0.1 }, "-=0.5");

  // Desktop cup tilt parallax
  const mm = gsap.matchMedia();
  mm.add("(min-width: 821px)", () => {
    const stage = $("[data-stage]");
    if (!stage) return;
    const move = (e) => {
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(".cup", { rotationY: dx * 12, rotationX: -dy * 9, duration: 0.6, ease: "power3.out", overwrite: "auto", transformPerspective: 900 });
    };
    const reset = () => gsap.to(".cup", { rotationY: 0, rotationX: 0, duration: 0.9, ease: "power3.out" });
    stage.addEventListener("mousemove", move);
    stage.addEventListener("mouseleave", reset);
    return () => { stage.removeEventListener("mousemove", move); stage.removeEventListener("mouseleave", reset); };
  });

  // Glow drift on scroll
  gsap.to("[data-aura]", { yPercent: 26, scale: 1.15, ease: "none", scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true } });
})();
