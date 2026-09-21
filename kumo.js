/* =========================================================
   Kumo — GSAP-driven interactions
   Entrance timeline, floating flavor cards, pointer parallax,
   real-time flavor switching, and scroll reveals.
   Degrades gracefully: if GSAP fails to load, everything stays
   visible and the flavor switch still works.
   ========================================================= */
"use strict";

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";

  const FLAVORS = {
    original: { name: "Original", desc: "Stone-ground ceremonial matcha over ice. Grassy, deeply umami, no bitterness." },
    vanilla: { name: "Vanilla Cloud", desc: "Ceremonial matcha folded with Madagascar vanilla and silky oat cream." },
    yuzu: { name: "Yuzu Zest", desc: "Bright Japanese citrus lifts the tea — fresh, sparkling, alive." },
    ceremonial: { name: "Ceremonial", desc: "Just matcha and hot water, whisked to a jade foam. Pure and intense." },
  };

  const cards = $$(".fcard");
  const nameEl = $("[data-readout-name]");
  const descEl = $("[data-readout-desc]");
  const badge = $("[data-product-badge]");
  const pimg = $(".product__img");
  const tint = $("[data-tint]");
  const svgDrink = $$(".product__svg .kcup__matcha, .product__svg .kcup__leaf");
  const svgFoam = $$(".product__svg .kcup__foam");

  // How each flavour re-tints the same cup (filter + colour wash)
  const FILTERS = {
    original: { hue: 0, sat: 1, bri: 1 },
    vanilla: { hue: -8, sat: 0.78, bri: 1.14 },
    yuzu: { hue: 26, sat: 1.3, bri: 1.06 },
    ceremonial: { hue: -4, sat: 1.42, bri: 0.84 },
  };
  if (pimg) { pimg.style.setProperty("--hue", "0"); pimg.style.setProperty("--sat", "1"); pimg.style.setProperty("--bri", "1"); }
  if (tint && cards[0]) tint.style.backgroundColor = cards[0].dataset.color;
  if (cards[0]) cards[0].classList.add("is-active");

  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  function applyLook(p, color, foam) {
    // Photo cup: re-tint via filter + colour wash
    if (pimg && hasGsap) {
      const cur = { hue: num(pimg.style.getPropertyValue("--hue"), 0), sat: num(pimg.style.getPropertyValue("--sat"), 1), bri: num(pimg.style.getPropertyValue("--bri"), 1) };
      gsap.to(cur, {
        hue: p.hue, sat: p.sat, bri: p.bri, duration: 0.7, ease: "power2.out",
        onUpdate() { pimg.style.setProperty("--hue", cur.hue); pimg.style.setProperty("--sat", cur.sat); pimg.style.setProperty("--bri", cur.bri); },
      });
      if (tint) gsap.to(tint, { backgroundColor: color, duration: 0.7, ease: "power2.out" });
    } else if (pimg) {
      pimg.style.setProperty("--hue", p.hue); pimg.style.setProperty("--sat", p.sat); pimg.style.setProperty("--bri", p.bri);
      if (tint) tint.style.backgroundColor = color;
    }
    // Custom SVG cup: recolour just the drink (a CSS transition on `fill`
    // animates it — GSAP won't tween SVG fill reliably from this build)
    svgDrink.forEach((e) => { e.style.fill = color; });
    svgFoam.forEach((e) => { e.style.fill = foam; });
  }

  /* ---------- Flavour switching: same cup, the drink re-tints ---------- */
  function selectFlavor(card) {
    cards.forEach((c) => c.classList.toggle("is-active", c === card));
    const { color, foam, flavor } = card.dataset;
    const f = FLAVORS[flavor] || FLAVORS.original;
    if (badge) badge.textContent = f.name;
    applyLook(FILTERS[flavor] || FILTERS.original, color, foam);
    if (hasGsap) {
      gsap.to("[data-readout]", {
        opacity: 0, y: 8, duration: 0.18,
        onComplete() { nameEl.textContent = f.name; descEl.textContent = f.desc; gsap.to("[data-readout]", { opacity: 1, y: 0, duration: 0.36, ease: "power3.out" }); },
      });
    } else {
      nameEl.textContent = f.name; descEl.textContent = f.desc;
    }
  }
  cards.forEach((c) => c.addEventListener("click", () => selectFlavor(c)));

  // Photo / Illustration view toggle
  const productEl = $("[data-product]");
  $$("[data-view-btn]").forEach((b) => b.addEventListener("click", () => {
    if (productEl) productEl.setAttribute("data-view", b.dataset.viewBtn);
    $$("[data-view-btn]").forEach((x) => { const on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-selected", String(on)); });
  }));
  const vParam = new URLSearchParams(location.search).get("view");
  if (vParam === "svg") { const b = $('[data-view-btn="svg"]'); if (b) b.click(); }

  // Optional deep-link, e.g. ?f=yuzu — preselect a flavour on load
  const fParam = new URLSearchParams(location.search).get("f");
  if (fParam) { const pre = cards.find((c) => c.dataset.flavor === fParam); if (pre) selectFlavor(pre); }

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
  if (buy) buy.addEventListener("click", () => showToast("Added to your ritual kit — demo only"));

  /* ---------- GSAP motion ---------- */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  // Scroll reveals (always, but instant when reduced motion)
  $$("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: reduced ? 0 : 44, duration: reduced ? 0.01 : 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });
  $$("[data-step]").forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: reduced ? 0 : 56, duration: reduced ? 0.01 : 0.85, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  const still = new URLSearchParams(location.search).has("still");
  if (reduced || still) return;

  // Hero entrance timeline (all .from so elements always settle to their
  // natural, visible state even if the timeline is cut short)
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from("[data-hero-line]", { opacity: 0, y: 48, duration: 1, stagger: 0.1 }, 0.1)
    .from(".hero__eyebrow", { opacity: 0, y: 16, duration: 0.7 }, 0.15)
    .from(".product", { opacity: 0, scale: 0.62, y: 44, duration: 1.1, ease: "back.out(1.4)" }, "-=0.55")
    .from(".fcard", { opacity: 0, y: 34, scale: 0.9, duration: 0.7, stagger: 0.1 }, "-=0.75")
    .from("[data-readout]", { opacity: 0, y: 16, duration: 0.6 }, "-=0.5")
    .from(".hero__cue", { opacity: 0, y: 10, duration: 0.6 }, "-=0.4");

  // Desktop-only ambient float + pointer parallax
  const mm = gsap.matchMedia();
  mm.add("(min-width: 821px)", () => {
    const floats = cards.map((c) =>
      gsap.to(c, { y: "+=16", duration: 3 + Math.random(), ease: "sine.inOut", repeat: -1, yoyo: true, delay: Math.random() })
    );
    const stage = $("[data-stage]");
    const move = (e) => {
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(".product", { x: dx * 30, y: dy * 20, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      gsap.to(cards, { x: -dx * 46, duration: 0.9, ease: "power3.out", overwrite: "auto" });
    };
    const reset = () => { gsap.to(".product", { x: 0, y: 0, duration: 0.9 }); gsap.to(cards, { x: 0, duration: 0.9 }); };
    stage.addEventListener("mousemove", move);
    stage.addEventListener("mouseleave", reset);
    return () => { floats.forEach((t) => t.kill()); stage.removeEventListener("mousemove", move); stage.removeEventListener("mouseleave", reset); };
  });

  // Parallax drift on the hero aura as you scroll away
  gsap.to("[data-aura]", { yPercent: 30, scale: 1.15, ease: "none", scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true } });
})();
