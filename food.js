/* =========================================================
   Kravr Eats — food ordering demo (vanilla, dependency-free)
   Menu pulled from the free TheMealDB API (real dishes + images).
   Cart, dish detail, customer reviews (write your own, saved locally),
   checkout (simulated). DOM built with createElement + textContent.
   ========================================================= */
"use strict";

(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const baht = (n) => "฿" + Math.round(n).toLocaleString("en-US");
  const FREE_SHIP = 300, SHIP_FEE = 39;
  const API = "https://www.themealdb.com/api/json/v1/1/";

  function el(tag, opts = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(opts)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "style") Object.assign(n.style, v);
      else if (k === "on") for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
      else if (v === true) n.setAttribute(k, "");
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c != null) n.append(c);
    return n;
  }

  /* ---------- Inline SVG icons ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const STAR_D = "M12 3.6l2.5 5.06 5.6.82-4.05 3.94.96 5.58L12 16.98 6.99 19.02l.96-5.58L3.9 9.48l5.6-.82L12 3.6Z";
  function starSVG(filled) {
    const s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", STAR_D); p.setAttribute("fill", "currentColor");
    s.append(p); if (!filled) s.classList.add("st-empty");
    return s;
  }
  function starRating(r) {
    const n = Math.round(r || 0);
    const wrap = el("span", { class: "stars", "aria-label": (r ? r.toFixed(1) : "0") + " ดาว" });
    for (let i = 0; i < 5; i++) wrap.append(starSVG(i < n));
    return wrap;
  }
  const ICON_D = {
    plus: "M12 6v12M6 12h12", minus: "M6 12h12", close: "M6 6l12 12M18 6 6 18", check: "M5 12.5l4.5 4.5L19 7.5",
  };
  function svgIcon(name) {
    const s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", ICON_D[name]); p.setAttribute("fill", "none");
    p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "2");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.append(p); return s;
  }

  /* ---------- Deterministic dish attributes (stable per meal id) ---------- */
  const hashId = (id) => { let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

  /* Categories to pull from TheMealDB → Thai labels */
  const CATS_DEF = [
    { c: "Beef", label: "เนื้อ" }, { c: "Chicken", label: "ไก่" }, { c: "Seafood", label: "ซีฟู้ด" },
    { c: "Pasta", label: "พาสต้า" }, { c: "Vegetarian", label: "มังสวิรัติ" }, { c: "Breakfast", label: "อาหารเช้า" },
    { c: "Dessert", label: "ของหวาน" }, { c: "Side", label: "ทานเล่น" },
  ];

  const g = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;
  const FALLBACK = [
    { id: "fb1", name: "ข้าวกะเพราไก่ไข่ดาว", emoji: "🍛", bg: g("#fff1e6", "#ffe0cc"), cat: "ไก่", price: 60, rating: 4.8, reviewCount: 210 },
    { id: "fb2", name: "ต้มยำกุ้งน้ำข้น", emoji: "🍲", bg: g("#ffe8d6", "#ffd8c2"), cat: "ซีฟู้ด", price: 180, rating: 4.9, reviewCount: 176 },
    { id: "fb3", name: "สปาเกตตี้คาโบนาร่า", emoji: "🍝", bg: g("#fff3e0", "#ffe6c7"), cat: "พาสต้า", price: 150, rating: 4.6, reviewCount: 98 },
    { id: "fb4", name: "สลัดผักอกไก่", emoji: "🥗", bg: g("#eaf7e1", "#dff0d0"), cat: "มังสวิรัติ", price: 120, rating: 4.5, reviewCount: 64 },
    { id: "fb5", name: "เค้กช็อกโกแลตลาวา", emoji: "🍰", bg: g("#f6e6da", "#efd6c4"), cat: "ของหวาน", price: 110, rating: 4.9, reviewCount: 143 },
    { id: "fb6", name: "เฟรนช์ฟรายส์ชีส", emoji: "🍟", bg: g("#fff6df", "#ffedc0"), cat: "ทานเล่น", price: 90, rating: 4.4, reviewCount: 77 },
  ];

  let MENU = [];
  let CATS = [{ id: "all", label: "ทั้งหมด" }];
  let cart = loadCart();
  let currentCat = "all";
  let searchTerm = "";
  function loadCart() { try { return JSON.parse(localStorage.getItem("kravr-eats-cart")) || {}; } catch (e) { return {}; } }
  function saveCart() { try { localStorage.setItem("kravr-eats-cart", JSON.stringify(cart)); } catch (e) {} }

  const byId = (id) => MENU.find((d) => d.id === id);
  const entries = () => Object.keys(cart).map((id) => ({ p: byId(id), qty: cart[id] })).filter((e) => e.p);
  const subtotal = () => entries().reduce((s, e) => s + e.p.price * e.qty, 0);
  const shipFee = () => { const s = subtotal(); return s === 0 || s >= FREE_SHIP ? 0 : SHIP_FEE; };
  const totalQty = () => Object.values(cart).reduce((a, b) => a + b, 0);

  const grid = $("[data-grid]"), emptyResults = $("[data-empty-results]"), filtersWrap = $("[data-filters]");

  function mapMeal(m, c) {
    const h = hashId(m.idMeal);
    return { id: m.idMeal, name: m.strMeal, img: m.strMealThumb, cat: c.label, catKey: c.c,
      price: 60 + (h % 25) * 10, rating: (38 + (h % 13)) / 10, reviewCount: 12 + (h % 230) };
  }
  function buildCategories() {
    const present = new Set(MENU.map((d) => d.cat));
    CATS = [{ id: "all", label: "ทั้งหมด" }];
    for (const c of CATS_DEF) if (present.has(c.label) && !CATS.some((x) => x.id === c.label)) CATS.push({ id: c.label, label: c.label });
    for (const label of present) if (!CATS.some((x) => x.id === label)) CATS.push({ id: label, label });
  }
  function renderSkeletons() {
    grid.replaceChildren(...Array.from({ length: 8 }, () =>
      el("div", { class: "skeleton" }, [el("div", { class: "skeleton__img" }), el("div", { class: "sk-line" }), el("div", { class: "sk-line sk-line--sm" })])));
  }
  function useFallback(msg) {
    MENU = FALLBACK; buildCategories(); renderFilters(); renderMenu(); renderCart();
    if (msg) toast("", msg, "");
  }
  async function loadMenu() {
    renderSkeletons();
    try {
      const results = await Promise.all(CATS_DEF.map(async (c) => {
        const r = await fetch(API + "filter.php?c=" + encodeURIComponent(c.c));
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        return (d.meals || []).slice(0, 8).map((m) => mapMeal(m, c));
      }));
      MENU = results.flat();
      if (!MENU.length) throw new Error("empty");
      buildCategories(); renderFilters(); renderMenu(); renderCart();
    } catch (e) {
      useFallback("โหลดเมนูไม่ได้ ใช้เมนูตัวอย่างแทน");
    }
  }

  function makeImg(d, alt) {
    if (d.img) {
      return el("img", { src: d.img, alt: alt || d.name, loading: "lazy", decoding: "async",
        on: { error: (e) => { e.target.style.display = "none"; } } });
    }
    return el("span", { text: d.emoji || "🍽️" });
  }

  /* ---------- Filters + menu grid ---------- */
  function renderFilters() {
    filtersWrap.replaceChildren(...CATS.map((c) =>
      el("button", { class: "filter" + (c.id === currentCat ? " is-active" : ""), type: "button", role: "tab",
        "aria-selected": String(c.id === currentCat), text: c.label,
        on: { click: () => { currentCat = c.id; renderFilters(); renderMenu(); } } })));
  }
  function renderMenu() {
    const term = searchTerm.trim().toLowerCase();
    const list = MENU.filter((d) => (currentCat === "all" || d.cat === currentCat) && (!term || d.name.toLowerCase().includes(term)));
    grid.replaceChildren(...list.map(dishCard));
    emptyResults.hidden = list.length > 0;
  }
  function dishCard(d) {
    const img = el("div", { class: "product__img", style: d.emoji ? { background: d.bg } : null, on: { click: () => openDish(d) } }, [makeImg(d)]);
    const meta = el("div", { class: "product__meta" }, [
      el("span", { class: "product__cat", text: d.cat }), starRating(d.rating),
      el("span", { class: "product__reviews", text: "(" + d.reviewCount + ")" }),
    ]);
    const price = el("span", { class: "product__price" }, [document.createTextNode(baht(d.price))]);
    const addBtn = el("button", { class: "add-btn", type: "button", "aria-label": "เพิ่ม " + d.name + " ลงตะกร้า",
      on: { click: (e) => { e.stopPropagation(); addToCart(d.id, 1); } } }, [svgIcon("plus")]);
    const body = el("div", { class: "product__body" }, [meta, el("h3", { class: "product__name", text: d.name }),
      el("div", { class: "product__row" }, [price, addBtn])]);
    return el("article", { class: "product", on: { click: () => openDish(d) } }, [img, body]);
  }

  /* ---------- Dish detail + reviews ---------- */
  const dishModal = $("[data-dish-modal]"), dishContent = $("[data-dish-content]");
  function ingredientList(full) {
    const items = [];
    for (let i = 1; i <= 20; i++) { const ing = full["strIngredient" + i]; const me = full["strMeasure" + i];
      if (ing && ing.trim()) items.push(((me && me.trim()) ? me.trim() + " " : "") + ing.trim()); }
    if (!items.length) return null;
    return el("div", {}, [el("p", { class: "dish__area", text: "ส่วนประกอบ" }),
      el("div", { class: "dish__ings" }, items.slice(0, 12).map((t) => el("span", { class: "dish__ing", text: t })))]);
  }
  async function openDish(d) {
    dishModal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
    dishContent.replaceChildren(el("button", { class: "icon-btn detail__close", type: "button", "aria-label": "ปิด", on: { click: closeDish } }, [svgIcon("close")]),
      el("p", { class: "load-error", text: "กำลังโหลดรายละเอียดเมนู…" }));
    let full = null;
    try { const r = await fetch(API + "lookup.php?i=" + encodeURIComponent(d.id)); if (r.ok) full = ((await r.json()).meals || [])[0]; } catch (e) {}
    if (dishModal.getAttribute("aria-hidden") === "true") return;
    renderDish(d, full);
  }
  function renderDish(d, full) {
    const close = el("button", { class: "icon-btn detail__close", type: "button", "aria-label": "ปิด", on: { click: closeDish } }, [svgIcon("close")]);
    const media = el("div", { class: "detail__media" }, [el("div", { class: "detail__hero", style: d.emoji ? { background: d.bg } : null }, [makeImg(d, d.name)])]);
    let qty = 1;
    const qNum = el("span", { class: "citem__qtynum", "aria-live": "polite", text: "1" });
    const qtybox = el("div", { class: "qtybox" }, [
      el("button", { class: "qty", type: "button", "aria-label": "ลด", on: { click: () => { qty = Math.max(1, qty - 1); qNum.textContent = String(qty); } } }, [svgIcon("minus")]),
      qNum,
      el("button", { class: "qty", type: "button", "aria-label": "เพิ่ม", on: { click: () => { qty = Math.min(20, qty + 1); qNum.textContent = String(qty); } } }, [svgIcon("plus")]),
    ]);
    const addBtn = el("button", { class: "btn btn--lg", type: "button", text: "เพิ่มลงตะกร้า", style: { flex: "1" },
      on: { click: () => { addToCart(d.id, qty); closeDish(); } } });
    const desc = full && full.strInstructions ? full.strInstructions.trim().slice(0, 300) + (full.strInstructions.trim().length > 300 ? "…" : "") : "เมนูแนะนำจากครัวของเรา ปรุงสดใหม่ พร้อมเสิร์ฟถึงหน้าบ้านคุณ";
    const info = el("div", { class: "detail__info" }, [
      el("span", { class: "detail__cat", text: d.cat }),
      full && full.strArea ? el("p", { class: "dish__area", text: "สไตล์: " + full.strArea }) : null,
      el("h2", { class: "detail__title", id: "dish-title", text: d.name }),
      el("div", { class: "detail__rating" }, [starRating(d.rating), el("small", { text: d.rating.toFixed(1) + " · " + d.reviewCount + " รีวิว" })]),
      el("div", { class: "detail__price" }, [document.createTextNode(baht(d.price))]),
      el("p", { class: "dish__desc", text: desc }),
      full ? ingredientList(full) : null,
      el("div", { class: "detail__foot" }, [qtybox, addBtn]),
    ]);
    dishContent.replaceChildren(close, el("div", { class: "detail__grid" }, [media, info]), reviewsSection(d));
  }
  function closeDish() { dishModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
  document.querySelectorAll("[data-close-dish]").forEach((b) => b.addEventListener("click", closeDish));

  /* Reviews (seeded + written by the visitor, stored locally) */
  const REVIEW_POOL = [
    { name: "พลอย", rating: 5, text: "อร่อยมาก รสชาติกลมกล่อม สั่งซ้ำแน่นอน!" },
    { name: "เอก", rating: 4, text: "ส่งไว ของยังร้อนอยู่เลย รสชาติโอเคมาก" },
    { name: "มะปราง", rating: 5, text: "พอร์ชั่นใหญ่ คุ้มราคา ชอบสุด ๆ" },
    { name: "ต้นน้ำ", rating: 4, text: "รสชาติใช้ได้เลย แต่รอนานนิดหน่อยช่วงพีค" },
    { name: "ใบเฟิร์น", rating: 5, text: "เมนูนี้ไม่ผิดหวัง แนะนำให้ลอง!" },
    { name: "กร", rating: 4, text: "อร่อยดีนะ แพ็กมาดีไม่หก" },
    { name: "นิว", rating: 5, text: "ฟินมาก เดี๋ยวสั่งอีกรอบแน่นอน" },
    { name: "แพร", rating: 4, text: "รสจัดกำลังดี เหมาะกินตอนหิว ๆ" },
    { name: "บอส", rating: 3, text: "โอเคตามราคา แต่ส่วนตัวชอบรสเข้มกว่านี้" },
    { name: "ฟ้า", rating: 5, text: "สดใหม่ สะอาด ประทับใจการบริการ" },
  ];
  function loadReviews() { try { return JSON.parse(localStorage.getItem("kravr-eats-reviews")) || {}; } catch (e) { return {}; } }
  function saveReviews(o) { try { localStorage.setItem("kravr-eats-reviews", JSON.stringify(o)); } catch (e) {} }
  function seededDate(n) { const days = (n % 28) + 1; return new Date(Date.now() - days * 86400000).toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
  function fmtToday() { return new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
  function seededReviews(d) {
    const h = hashId(d.id), n = 1 + (h % 2), out = [], seen = new Set();
    for (let i = 0; i < n; i++) { let idx = (h + i * 7) % REVIEW_POOL.length; while (seen.has(idx)) idx = (idx + 1) % REVIEW_POOL.length; seen.add(idx);
      out.push({ ...REVIEW_POOL[idx], date: seededDate(h + i) }); }
    return out;
  }
  function reviewItem(r) {
    return el("div", { class: "review" + (r.mine ? " review--mine" : "") }, [
      el("div", { class: "review__ava", "aria-hidden": "true", text: (r.name || "?").trim().charAt(0) }),
      el("div", {}, [
        el("div", { class: "review__top" }, [el("span", { class: "review__name", text: r.name || "ลูกค้า" }),
          r.mine ? el("span", { class: "product__cat", text: "รีวิวของคุณ" }) : null, el("span", { class: "review__date", text: r.date || "" })]),
        starRating(r.rating),
        el("p", { class: "review__text", text: r.text }),
      ]),
    ]);
  }
  function reviewForm(d) {
    let rating = 5;
    const btns = [];
    const stars = el("div", { class: "stars-input", role: "radiogroup", "aria-label": "ให้คะแนน" });
    for (let i = 1; i <= 5; i++) { const b = el("button", { type: "button", "aria-label": i + " ดาว", on: { click: () => { rating = i; paint(); } } }, [starSVG(true)]); btns.push(b); stars.append(b); }
    const paint = () => btns.forEach((b, idx) => b.classList.toggle("on", idx < rating));
    paint();
    const text = el("textarea", { name: "rtext", rows: "2", placeholder: "เล่าให้ฟังหน่อยว่าเมนูนี้เป็นยังไง…", required: true });
    const name = el("input", { type: "text", name: "rname", placeholder: "ชื่อของคุณ (ไม่บังคับ)", autocomplete: "name" });
    const err = el("p", { class: "review-form__err", hidden: true });
    const form = el("form", { novalidate: true }, [
      el("p", { class: "review-form__t", text: "ให้คะแนนและรีวิวเมนูนี้" }), stars,
      el("label", { class: "field" }, [el("span", { text: "ความคิดเห็น" }), text]),
      el("label", { class: "field" }, [el("span", { text: "ชื่อ" }), name]),
      err, el("button", { class: "btn btn--block", type: "submit", text: "ส่งรีวิว" }),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!text.value.trim()) { err.textContent = "ช่วยเขียนความคิดเห็นสักนิดนะ"; err.hidden = false; return; }
      const store = loadReviews();
      (store[d.id] = store[d.id] || []).unshift({ name: name.value.trim() || "คุณลูกค้า", rating, text: text.value.trim(), date: fmtToday(), ts: Date.now() });
      saveReviews(store);
      const sec = form.closest(".dish-reviews");
      if (sec) sec.replaceWith(reviewsSection(d));
      toast("", "ขอบคุณสำหรับรีวิว!", "", true);
    });
    return el("div", { class: "review-form" }, [form]);
  }
  function reviewsSection(d) {
    const mine = (loadReviews()[d.id] || []).map((r) => ({ ...r, mine: true }));
    const all = mine.concat(seededReviews(d));
    const total = d.reviewCount + mine.length;
    const head = el("div", { class: "dish-reviews__head" }, [
      el("h3", { text: "รีวิวจากลูกค้า" }),
      el("div", { class: "dish-reviews__avg" }, [starRating(d.rating), el("strong", { text: d.rating.toFixed(1) }), el("span", { text: "(" + total + " รีวิว)" })]),
    ]);
    return el("div", { class: "dish-reviews" }, [head, el("div", { class: "review-list" }, all.map(reviewItem)), reviewForm(d)]);
  }

  /* ---------- Cart ---------- */
  const cartEl = $("[data-cart]"), scrim = $("[data-scrim]");
  const cartItems = $("[data-cart-items]"), cartEmpty = $("[data-cart-empty]");
  const cartFoot = $("[data-cart-foot]"), badge = $("[data-cart-count]");
  function addToCart(id, qty) {
    cart[id] = (cart[id] || 0) + (qty || 1);
    saveCart(); renderCart();
    badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop");
    const p = byId(id);
    toast("เพิ่ม", p ? p.name : "อาหาร", "ลงตะกร้าแล้ว", true);
  }
  function setQty(id, delta) { cart[id] = (cart[id] || 0) + delta; if (cart[id] <= 0) delete cart[id]; saveCart(); renderCart(); }
  function removeItem(id) { delete cart[id]; saveCart(); renderCart(); }
  function updateBadge() { const q = totalQty(); badge.textContent = String(q); badge.hidden = q === 0; }
  function renderCart() {
    const list = entries();
    updateBadge();
    const has = list.length > 0;
    cartEmpty.style.display = has ? "none" : "flex";
    cartFoot.hidden = !has;
    $("[data-ship-wrap]").style.display = has ? "block" : "none";
    cartItems.replaceChildren(...list.map(({ p, qty }) => el("div", { class: "citem" }, [
      el("div", { class: "citem__img", style: p.emoji ? { background: p.bg } : null }, [makeImg(p, p.name)]),
      el("div", {}, [
        el("div", { class: "citem__name", text: p.name }),
        el("div", { class: "citem__price", text: baht(p.price) }),
        el("div", { class: "citem__ctrls" }, [
          el("button", { class: "qty", type: "button", "aria-label": "ลดจำนวน", on: { click: () => setQty(p.id, -1) } }, [svgIcon("minus")]),
          el("span", { class: "citem__qtynum", text: String(qty) }),
          el("button", { class: "qty", type: "button", "aria-label": "เพิ่มจำนวน", on: { click: () => setQty(p.id, 1) } }, [svgIcon("plus")]),
        ]),
      ]),
      el("div", { class: "citem__right" }, [
        el("div", { class: "citem__total", text: baht(p.price * qty) }),
        el("button", { class: "citem__rm", type: "button", text: "ลบ", on: { click: () => removeItem(p.id) } }),
      ]),
    ])));
    const sub = subtotal(), ship = shipFee();
    $("[data-cart-subtotal]").textContent = baht(sub);
    $("[data-cart-ship]").textContent = ship === 0 ? (sub >= FREE_SHIP ? "ฟรี" : "—") : baht(ship);
    $("[data-cart-total]").textContent = baht(sub + ship);
    const remain = Math.max(0, FREE_SHIP - sub);
    $("[data-ship-bar]").style.width = Math.min(100, (sub / FREE_SHIP) * 100) + "%";
    $("[data-ship-text]").replaceChildren(remain > 0
      ? el("span", {}, ["สั่งอีก ", el("strong", { text: baht(remain) }), " รับส่งฟรี!"])
      : el("span", {}, [el("strong", { text: "คุณได้สิทธิ์ส่งฟรีแล้ว" })]));
  }
  function openCart() { cartEl.classList.add("is-open"); scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("is-open")); cartEl.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); }
  function closeCart() { cartEl.classList.remove("is-open"); scrim.classList.remove("is-open"); setTimeout(() => { scrim.hidden = true; }, 300); cartEl.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
  document.querySelectorAll("[data-open-cart]").forEach((b) => b.addEventListener("click", openCart));
  document.querySelectorAll("[data-close-cart]").forEach((b) => b.addEventListener("click", closeCart));
  scrim.addEventListener("click", closeCart);

  /* ---------- Checkout (simulated) ---------- */
  const modal = $("[data-checkout-modal]"), coForm = $("[data-checkout-form]");
  const stepForm = $('[data-checkout-step="form"]'), stepSuccess = $('[data-checkout-step="success"]'), coFoot = $("[data-checkout-foot]");
  function openCheckout() {
    if (entries().length === 0) { toast("", "ยังไม่มีอาหารในตะกร้า", ""); return; }
    closeCart();
    stepForm.hidden = false; stepSuccess.hidden = true; coFoot.style.display = "";
    $("[data-co-total]").textContent = baht(subtotal() + shipFee());
    modal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
  }
  function closeCheckout() { modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); clearInterval(trackTimer); trackTimer = null; }
  $("[data-checkout]").addEventListener("click", openCheckout);
  document.querySelectorAll("[data-close-checkout]").forEach((b) => b.addEventListener("click", closeCheckout));
  function placeOrder() {
    if (!coForm.reportValidity()) return;
    const fd = new FormData(coForm);
    const addr = (fd.get("address") || "").toString().trim();
    const total = subtotal() + shipFee();
    $("[data-order-no]").textContent = "#EAT-" + String(Math.floor(100000 + Math.random() * 900000));
    $("[data-order-total]").textContent = baht(total);
    cart = {}; saveCart(); renderCart();
    stepForm.hidden = true; coFoot.style.display = "none"; stepSuccess.hidden = false;
    modal.querySelector(".modal__card").scrollTop = 0;
    startTracking({ addr: addr ? (addr.length > 30 ? addr.slice(0, 30) + "…" : addr) : "ที่อยู่ของคุณ" });
    launchConfetti();
  }
  $("[data-place-order]").addEventListener("click", placeOrder);
  coForm.addEventListener("submit", (e) => { e.preventDefault(); placeOrder(); });

  /* ---------- Delivery tracking (simulated, GrabFood-style) ---------- */
  let trackTimer = null;
  const STAGES = [
    { label: "ร้านรับออเดอร์แล้ว", pill: "รับออเดอร์แล้ว", at: 0 },
    { label: "กำลังปรุงอาหาร", pill: "กำลังปรุงอาหาร", at: 6 },
    { label: "ไรเดอร์รับอาหารแล้ว", pill: "ไรเดอร์รับอาหาร", at: 16 },
    { label: "กำลังจัดส่งถึงคุณ", pill: "กำลังจัดส่ง", at: 22 },
    { label: "ถึงแล้ว — อร่อยนะ!", pill: "จัดส่งสำเร็จ", at: 52 },
  ];
  const TOTAL_T = 52, MOVE_START = 22, MOVE_END = 52;
  document.querySelectorAll("[data-rider-action]").forEach((b) => b.addEventListener("click", () => toast("", "โหมดสาธิต — ติดต่อไรเดอร์ไม่ได้จริง", "")));
  function startTracking(order) {
    $("[data-order-addr]").textContent = order.addr;
    const rider = $("[data-rider]"), routeGeo = $(".route"), routeDone = $("[data-route-done]");
    const etaEl = $("[data-track-eta]"), pill = $("[data-track-status]"), stepsEl = $("[data-track-steps]");
    const len = routeGeo.getTotalLength();
    routeDone.style.strokeDasharray = String(len);
    routeDone.style.strokeDashoffset = String(len);
    const t0 = Date.now();
    const riderT = (e) => e <= MOVE_START ? 0 : e >= MOVE_END ? 1 : (e - MOVE_START) / (MOVE_END - MOVE_START);
    const activeStage = (e) => { let s = 0; for (let i = 0; i < STAGES.length; i++) if (e >= STAGES[i].at) s = i; return s; };
    function renderSteps(active) {
      stepsEl.replaceChildren(...STAGES.map((st, i) => {
        const sub = i < active ? "เสร็จแล้ว" : i === active ? (i === STAGES.length - 1 ? "เรียบร้อย!" : "กำลังดำเนินการ…") : "";
        return el("li", { class: i < active ? "done" : i === active ? "active" : "" }, [document.createTextNode(st.label), sub ? el("small", { text: sub }) : null]);
      }));
    }
    function tick() {
      const e = (Date.now() - t0) / 1000;
      const t = riderT(e), pt = routeGeo.getPointAtLength(t * len);
      rider.setAttribute("transform", "translate(" + pt.x.toFixed(1) + "," + pt.y.toFixed(1) + ")");
      routeDone.style.strokeDashoffset = (len * (1 - t)).toFixed(1);
      const active = activeStage(e), delivered = active >= STAGES.length - 1;
      pill.textContent = STAGES[active].pill;
      pill.classList.toggle("done", delivered);
      etaEl.textContent = delivered ? "ถึงแล้ว" : Math.max(1, Math.round(28 * (1 - e / TOTAL_T))) + " นาที";
      renderSteps(active);
      if (delivered) { clearInterval(trackTimer); trackTimer = null; launchConfetti(); }
    }
    clearInterval(trackTimer); tick(); trackTimer = setInterval(tick, 1000);
  }

  /* ---------- Toast / Confetti / Search / Theme ---------- */
  const toastEl = $("[data-toast]"); let toastTimer = null;
  function toast(prefix, strongText, suffix, withIcon) {
    const parts = [];
    if (withIcon) parts.push(svgIcon("check"));
    if (prefix) parts.push(document.createTextNode(prefix + " "));
    if (strongText) parts.push(el("strong", { text: strongText }));
    if (suffix) parts.push(document.createTextNode(" " + suffix));
    toastEl.replaceChildren(...parts);
    toastEl.hidden = false; requestAnimationFrame(() => toastEl.classList.add("is-show"));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.classList.remove("is-show"); setTimeout(() => { toastEl.hidden = true; }, 300); }, 1900);
  }
  const confettiLayer = $("[data-confetti]");
  function launchConfetti() {
    if (prefersReduced) return;
    const colors = ["#e8590c", "#fd7e14", "#f08c00", "#2f9e6f", "#3a3942", "#ffd8a8"];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) frag.append(el("span", { style: { left: Math.random() * 100 + "vw", background: colors[i % colors.length], animationDuration: (2.2 + Math.random() * 1.8) + "s", animationDelay: Math.random() * 0.5 + "s", transform: "translateY(0) rotate(" + Math.random() * 360 + "deg)" } }));
    confettiLayer.replaceChildren(frag);
    setTimeout(() => confettiLayer.replaceChildren(), 4500);
  }
  const search = $("#search");
  if (search) search.addEventListener("input", () => { searchTerm = search.value; renderMenu(); });
  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", () => { const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark"; root.setAttribute("data-theme", next); try { localStorage.setItem("kravr-theme", next); } catch (e) {} });
  const yearEl = $("[data-year]"); if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (dishModal.getAttribute("aria-hidden") === "false") closeDish();
    else if (modal.getAttribute("aria-hidden") === "false") closeCheckout();
    else if (cartEl.classList.contains("is-open")) closeCart();
  });

  /* ---------- Init ---------- */
  renderCart();
  loadMenu();
})();
