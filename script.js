/* =========================================================
   Kravr — shopping demo logic (vanilla, dependency-free)
   Real products pulled from the free DummyJSON API (images + details),
   with a built-in fallback if the API is unreachable.
   Cart, drawer, product detail, checkout (simulated), search, toast, confetti.
   Everything is client-side. Checkout collects/stores/sends nothing real.
   DOM built with createElement + textContent (no innerHTML).
   ========================================================= */
"use strict";

(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const baht = (n) => "฿" + Math.round(n).toLocaleString("en-US");
  const FREE_SHIP = 1000, SHIP_FEE = 50;

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
  /* ---------- Inline SVG icons (no emoji) ---------- */
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
    plus: "M12 6v12M6 12h12",
    minus: "M6 12h12",
    close: "M6 6l12 12M18 6 6 18",
    check: "M5 12.5l4.5 4.5L19 7.5",
    heart: "M12 20.3l-1.3-1.2C6.3 15.1 3.5 12.6 3.5 9.4 3.5 6.9 5.5 5 8 5c1.4 0 2.8.66 3.7 1.72l.3.35.3-.35C13.2 5.66 14.6 5 16 5c2.5 0 4.5 1.9 4.5 4.4 0 3.2-2.8 5.7-7.2 9.7L12 20.3Z",
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

  /* Category display order (Thai labels) */
  const CAT_ORDER = ["ความงาม", "น้ำหอม", "สกินแคร์", "แว่นตา", "กระเป๋า", "เครื่องประดับ", "นาฬิกา", "เดรส", "เสื้อผ้า", "รองเท้า", "แกดเจ็ต", "สปอร์ต"];

  /* Live products: DummyJSON (real images/details). Curated Thai products.json is the offline fallback. */
  const RATE = 35; // USD → THB
  const API = "https://dummyjson.com/products?limit=0&select=title,price,discountPercentage,rating,stock,brand,category,thumbnail,images,description";
  const CATEGORY_MAP = {
    beauty: "ความงาม", fragrances: "น้ำหอม", "skin-care": "สกินแคร์",
    sunglasses: "แว่นตา", "womens-bags": "กระเป๋า", "womens-jewellery": "เครื่องประดับ",
    "mens-watches": "นาฬิกา", "womens-watches": "นาฬิกา", "womens-dresses": "เดรส",
    tops: "เสื้อผ้า", "womens-shoes": "รองเท้า", "mens-shoes": "รองเท้า",
    "mobile-accessories": "แกดเจ็ต", "sports-accessories": "สปอร์ต",
  };

  /* Fallback (used only if the API is unreachable) */
  const g = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;
  const FALLBACK = [
    { id: "f1", name: "หูฟังไร้สาย Aura", price: 1290, old: 1690, cat: "gadget", catLabel: "แกดเจ็ต", emoji: "🎧", bg: g("#fce7f3", "#e9d5ff"), rating: 5, stock: 12, brand: "Aura", desc: "หูฟังไร้สายเสียงคมชัด ตัดเสียงรบกวน แบตอึด", tag: "ขายดี" },
    { id: "f2", name: "สมาร์ทวอทช์ Pulse", price: 2490, cat: "gadget", catLabel: "แกดเจ็ต", emoji: "⌚", bg: g("#dbeafe", "#e9d5ff"), rating: 5, stock: 8, brand: "Pulse", desc: "สมาร์ทวอทช์วัดหัวใจ นับก้าว กันน้ำ", tag: "ใหม่" },
    { id: "f3", name: "กระเป๋าสะพาย Mini", price: 690, old: 990, cat: "womens-bags", catLabel: "กระเป๋า", emoji: "👜", bg: g("#ffe4e6", "#f5d0fe"), rating: 5, stock: 20, brand: "Mini", desc: "กระเป๋าสะพายทรงมินิ ใส่ของได้เยอะกว่าที่คิด", tag: "ลด 30%" },
    { id: "f4", name: "รองเท้าผ้าใบ Cloud", price: 1590, cat: "womens-shoes", catLabel: "รองเท้า", emoji: "👟", bg: g("#e0f2fe", "#ede9fe"), rating: 5, stock: 5, brand: "Cloud", desc: "รองเท้าผ้าใบนุ่มสบาย ใส่เดินทั้งวันไม่เมื่อย", tag: "ขายดี" },
    { id: "f5", name: "น้ำหอม Bloom", price: 1890, cat: "fragrances", catLabel: "น้ำหอม", emoji: "🌸", bg: g("#fce7f3", "#fbcfe8"), rating: 5, stock: 15, brand: "Bloom", desc: "น้ำหอมกลิ่นดอกไม้ ติดทนนาน", tag: null },
    { id: "f6", name: "ลิปสติกแมตต์", price: 350, cat: "beauty", catLabel: "ความงาม", emoji: "💄", bg: g("#ffe4e6", "#fecdd3"), rating: 4, stock: 40, brand: "Glow", desc: "ลิปแมตต์เนื้อนุ่ม ติดทน ไม่ตกร่อง", tag: null },
    { id: "f7", name: "แว่นกันแดด Retro", price: 490, cat: "sunglasses", catLabel: "แว่นตา", emoji: "🕶️", bg: g("#fef9c3", "#fed7aa"), rating: 4, stock: 25, brand: "Retro", desc: "แว่นกันแดดทรงเรโทร กัน UV400", tag: null },
    { id: "f8", name: "เซตสกินแคร์เรืองแสง", price: 1290, cat: "skin-care", catLabel: "สกินแคร์", emoji: "🧴", bg: g("#d1fae5", "#e0f2fe"), rating: 5, stock: 10, brand: "Dewy", desc: "เซตสกินแคร์ครบสเต็ป เพื่อผิวเรืองแสงสุขภาพดี", tag: "ใหม่" },
  ];

  let PRODUCTS = [];
  let CATS = [{ id: "all", label: "ทั้งหมด" }];

  /* ---------- State ---------- */
  let cart = loadCart();
  const favs = new Set();
  let currentCat = "all";
  let searchTerm = "";
  function loadCart() { try { return JSON.parse(localStorage.getItem("kravr-cart")) || {}; } catch (e) { return {}; } }
  function saveCart() { try { localStorage.setItem("kravr-cart", JSON.stringify(cart)); } catch (e) {} }

  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const entries = () => Object.keys(cart).map((id) => ({ p: byId(id), qty: cart[id] })).filter((e) => e.p);
  const subtotal = () => entries().reduce((s, e) => s + e.p.price * e.qty, 0);
  const shipFee = () => { const s = subtotal(); return s === 0 || s >= FREE_SHIP ? 0 : SHIP_FEE; };
  const totalQty = () => Object.values(cart).reduce((a, b) => a + b, 0);

  /* ---------- Fetch products ---------- */
  const grid = $("[data-grid]");
  const emptyResults = $("[data-empty-results]");

  function buildCategories() {
    const present = new Set(PRODUCTS.map((p) => p.catLabel));
    CATS = [{ id: "all", label: "ทั้งหมด" }];
    for (const label of CAT_ORDER) if (present.has(label)) CATS.push({ id: label, label });
    for (const label of present) if (!CATS.some((c) => c.id === label)) CATS.push({ id: label, label });
  }
  function renderSkeletons() {
    grid.replaceChildren(...Array.from({ length: 8 }, () =>
      el("div", { class: "skeleton" }, [
        el("div", { class: "skeleton__img" }),
        el("div", { class: "sk-line" }), el("div", { class: "sk-line sk-line--sm" }),
      ])
    ));
  }
  function useFallback(msg) {
    PRODUCTS = FALLBACK;
    buildCategories(); renderFilters(); renderProducts(); renderCart();
    if (msg) toast("", msg, "");
  }
  function mapProduct(p) {
    const price = Math.round(p.price * RATE);
    const disc = p.discountPercentage || 0;
    const old = disc > 1 ? Math.round(price / (1 - disc / 100)) : null;
    const imgs = p.images && p.images.length ? p.images : [p.thumbnail];
    return {
      id: "d" + p.id, name: p.title, price, old,
      img: p.thumbnail, images: imgs,
      cat: p.category, catLabel: CATEGORY_MAP[p.category] || p.category,
      brand: p.brand || "", rating: p.rating || 0, stock: p.stock || 0, desc: p.description || "",
      tag: disc >= 15 ? "ลด " + Math.round(disc) + "%" : (p.rating >= 4.7 ? "ขายดี" : null),
    };
  }
  async function fetchCurated() {
    const res = await fetch("products.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("empty");
    return data;
  }
  async function loadProducts() {
    renderSkeletons();
    let list = null;
    try {
      // Primary: live products from DummyJSON (real images + details)
      const res = await fetch(API);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const mapped = (data.products || []).filter((p) => CATEGORY_MAP[p.category]).map(mapProduct);
      if (!mapped.length) throw new Error("empty");
      list = mapped;
    } catch (e) {
      // Fallback 1: curated Thai catalog bundled with the site
      try { list = await fetchCurated(); } catch (e2) { /* handled below */ }
    }
    if (list && list.length) {
      PRODUCTS = list;
      buildCategories(); renderFilters(); renderProducts(); renderCart();
    } else {
      // Fallback 2: tiny built-in sample so the shop never looks broken
      useFallback("โหลดสินค้าไม่ได้ ใช้ข้อมูลตัวอย่างแทน");
    }
  }

  /* ---------- Product image helper ---------- */
  function makeImg(p, alt) {
    if (p.img) {
      return el("img", {
        src: p.img, alt: alt || p.name, loading: "lazy", decoding: "async",
        on: { error: (e) => { e.target.style.display = "none"; } },
      });
    }
    return el("span", { text: p.emoji || "🛍️" }); // fallback tile
  }

  /* ---------- Filters ---------- */
  const filtersWrap = $("[data-filters]");
  function renderFilters() {
    filtersWrap.replaceChildren(...CATS.map((c) =>
      el("button", {
        class: "filter" + (c.id === currentCat ? " is-active" : ""),
        type: "button", role: "tab", "aria-selected": String(c.id === currentCat), text: c.label,
        on: { click: () => { currentCat = c.id; renderFilters(); renderProducts(); } },
      })
    ));
  }

  /* ---------- Products grid ---------- */
  function renderProducts() {
    const term = searchTerm.trim().toLowerCase();
    const list = PRODUCTS.filter((p) =>
      (currentCat === "all" || p.catLabel === currentCat) &&
      (!term || p.name.toLowerCase().includes(term) || (p.brand && p.brand.toLowerCase().includes(term)))
    );
    grid.replaceChildren(...list.map(productCard));
    emptyResults.hidden = list.length > 0;
  }
  function productCard(p) {
    const fav = el("button", { class: "product__fav" + (favs.has(p.id) ? " is-fav" : ""), type: "button",
      "aria-label": "ถูกใจ " + p.name, "aria-pressed": String(favs.has(p.id)),
      on: { click: (e) => { e.stopPropagation(); favs.has(p.id) ? favs.delete(p.id) : favs.add(p.id); renderProducts(); } } },
      [svgIcon("heart")]);
    const img = el("div", { class: "product__img", style: p.emoji ? { background: p.bg } : null,
      on: { click: () => openDetail(p) } },
      [makeImg(p), p.tag ? el("span", { class: "product__tag", text: p.tag }) : null, fav]);
    const price = el("span", { class: "product__price" + (p.old ? " is-sale" : "") },
      [p.old ? el("s", { text: baht(p.old) }) : null, document.createTextNode(baht(p.price))]);
    const out = p.stock <= 0;
    const addBtn = el("button", { class: "add-btn", type: "button", disabled: out || false,
      "aria-label": "เพิ่ม " + p.name + " ลงตะกร้า",
      on: { click: (e) => { e.stopPropagation(); addToCart(p.id, 1); } } },
      [svgIcon("plus")]);
    const stockEl = el("span", { class: "product__stock" + (out ? " out" : p.stock < 10 ? " low" : ""),
      text: out ? "สินค้าหมด" : p.stock < 10 ? "เหลือ " + p.stock + " ชิ้น" : "มีสินค้า" });
    const body = el("div", { class: "product__body" }, [
      starRating(p.rating),
      el("h3", { class: "product__name", text: p.name }),
      stockEl,
      el("div", { class: "product__row" }, [price, addBtn]),
    ]);
    return el("article", { class: "product", on: { click: () => openDetail(p) } }, [img, body]);
  }

  /* ---------- Product detail modal ---------- */
  const detailModal = $("[data-detail-modal]");
  const detailContent = $("[data-detail-content]");
  function openDetail(p) {
    let qty = 1;
    const hero = el("div", { class: "detail__hero" }, [makeImg(p, p.name)]);
    const swap = (src) => { const im = hero.querySelector("img"); if (im) im.src = src; };
    const thumbs = (p.images && p.images.length > 1)
      ? el("div", { class: "detail__thumbs" }, p.images.slice(0, 5).map((src, i) =>
          el("button", { class: "detail__thumb" + (i === 0 ? " is-active" : ""), type: "button", "aria-label": "รูปที่ " + (i + 1),
            on: { click: (e) => { swap(src); detailContent.querySelectorAll(".detail__thumb").forEach((t) => t.classList.remove("is-active")); e.currentTarget.classList.add("is-active"); } } },
            [el("img", { src, alt: "", loading: "lazy" })])))
      : null;
    const media = el("div", { class: "detail__media" }, [hero, thumbs]);

    const qNum = el("span", { class: "citem__qtynum", "aria-live": "polite", text: "1" });
    const out = p.stock <= 0;
    const qtybox = el("div", { class: "qtybox" }, [
      el("button", { class: "qty", type: "button", "aria-label": "ลด", on: { click: () => { qty = Math.max(1, qty - 1); qNum.textContent = String(qty); } } }, [svgIcon("minus")]),
      qNum,
      el("button", { class: "qty", type: "button", "aria-label": "เพิ่ม", on: { click: () => { qty = Math.min(p.stock || 99, qty + 1); qNum.textContent = String(qty); } } }, [svgIcon("plus")]),
    ]);
    const addBtn = el("button", { class: "btn btn--lg", type: "button", disabled: out || false, text: out ? "สินค้าหมด" : "เพิ่มลงตะกร้า",
      style: { flex: "1" }, on: { click: () => { addToCart(p.id, qty); closeDetail(); } } });

    const info = el("div", { class: "detail__info" }, [
      el("span", { class: "detail__cat", text: p.catLabel }),
      p.brand ? el("p", { class: "detail__brand", text: "แบรนด์: " + p.brand }) : null,
      el("h2", { class: "detail__title", id: "detail-title", text: p.name }),
      el("div", { class: "detail__rating" }, [starRating(p.rating), el("small", { text: p.rating ? p.rating.toFixed(1) : "" })]),
      el("div", { class: "detail__price" }, [p.old ? el("s", { text: baht(p.old) }) : null, document.createTextNode(baht(p.price))]),
      el("p", { class: "detail__desc", text: p.desc || "สินค้าคุณภาพดี คัดสรรมาเพื่อคุณ" }),
      el("span", { class: "product__stock" + (out ? " out" : p.stock < 10 ? " low" : ""), text: out ? "สินค้าหมด" : "เหลือ " + p.stock + " ชิ้น" }),
      el("div", { class: "detail__foot" }, out ? [addBtn] : [qtybox, addBtn]),
    ]);

    const close = el("button", { class: "icon-btn detail__close", type: "button", "aria-label": "ปิด",
      on: { click: closeDetail } }, [svgIcon("close")]);

    detailContent.replaceChildren(close, el("div", { class: "detail__grid" }, [media, info]));
    detailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
  function closeDetail() { detailModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
  document.querySelectorAll("[data-close-detail]").forEach((b) => b.addEventListener("click", closeDetail));

  /* ---------- Cart ---------- */
  const cartEl = $("[data-cart]"), scrim = $("[data-scrim]");
  const cartItems = $("[data-cart-items]"), cartEmpty = $("[data-cart-empty]");
  const cartFoot = $("[data-cart-foot]"), badge = $("[data-cart-count]");

  function addToCart(id, qty) {
    cart[id] = (cart[id] || 0) + (qty || 1);
    saveCart(); renderCart();
    badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop");
    const p = byId(id);
    toast("เพิ่ม", p ? p.name : "สินค้า", "ลงตะกร้าแล้ว", true);
  }
  function setQty(id, delta) { cart[id] = (cart[id] || 0) + delta; if (cart[id] <= 0) delete cart[id]; saveCart(); renderCart(); }
  function removeItem(id) { delete cart[id]; saveCart(); renderCart(); }

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
      ? el("span", {}, ["ช้อปอีก ", el("strong", { text: baht(remain) }), " รับส่งฟรี!"])
      : el("span", {}, [el("strong", { text: "คุณได้สิทธิ์ส่งฟรีแล้ว" })]));
  }
  function updateBadge() { const q = totalQty(); badge.textContent = String(q); badge.hidden = q === 0; }

  function openCart() { cartEl.classList.add("is-open"); scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("is-open")); cartEl.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); }
  function closeCart() { cartEl.classList.remove("is-open"); scrim.classList.remove("is-open"); setTimeout(() => { scrim.hidden = true; }, 300); cartEl.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
  document.querySelectorAll("[data-open-cart]").forEach((b) => b.addEventListener("click", openCart));
  document.querySelectorAll("[data-close-cart]").forEach((b) => b.addEventListener("click", closeCart));
  scrim.addEventListener("click", closeCart);

  /* ---------- Checkout (simulated) ---------- */
  const modal = $("[data-checkout-modal]"), coForm = $("[data-checkout-form]");
  const stepForm = $('[data-checkout-step="form"]'), stepSuccess = $('[data-checkout-step="success"]'), coFoot = $("[data-checkout-foot]");
  function openCheckout() {
    if (entries().length === 0) { toast("", "ตะกร้ายังว่างอยู่", ""); return; }
    closeCart();
    stepForm.hidden = false; stepSuccess.hidden = true; coFoot.style.display = "";
    $("[data-co-total]").textContent = baht(subtotal() + shipFee());
    modal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
  }
  function closeCheckout() { modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); clearInterval(successTimer); successTimer = null; }
  $("[data-checkout]").addEventListener("click", openCheckout);
  document.querySelectorAll("[data-close-checkout]").forEach((b) => b.addEventListener("click", closeCheckout));
  function placeOrder() {
    if (!coForm.reportValidity()) return;
    const name = (new FormData(coForm).get("name") || "").toString().trim();
    const total = subtotal() + shipFee();
    const items = entries().map(({ p, qty }) => ({ name: p.name, qty, price: p.price, img: p.img || null }));
    const order = {
      no: "#KRV-" + String(Math.floor(100000 + Math.random() * 900000)),
      track: "TH" + String(Math.floor(1e9 + Math.random() * 9e9)),
      total, items, placedAt: Date.now(),
    };
    const orders = loadOrders(); orders.unshift(order); saveOrders(orders);

    $("[data-success-msg]").textContent = (name ? "ขอบคุณ " + name.split(" ")[0] + "! " : "") + "คำสั่งซื้อของคุณได้รับการยืนยันแล้ว";
    $("[data-order-no]").textContent = order.no;
    $("[data-order-total]").textContent = baht(total);
    cart = {}; saveCart(); renderCart();
    stepForm.hidden = true; coFoot.style.display = "none"; stepSuccess.hidden = false;
    modal.querySelector(".modal__card").scrollTop = 0;
    renderSuccessTrack(order);
    launchConfetti();
  }
  $("[data-place-order]").addEventListener("click", placeOrder);
  coForm.addEventListener("submit", (e) => { e.preventDefault(); placeOrder(); });

  /* ---------- Order tracking + My Orders (simulated) ---------- */
  const STEP_LABELS = ["สั่งซื้อแล้ว", "ร้านยืนยันแล้ว", "กำลังจัดส่ง", "ถึงมือคุณแล้ว"];
  const STAGE_SECONDS = [0, 10, 25, 45]; // accelerated timeline so the demo advances while you watch
  const STEP_ICON_PATHS = [
    ["M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z", "M9 8.5h6M9 12h6"],           // ordered (receipt)
    ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z", "M8.4 12.2l2.4 2.4 4.8-5"], // confirmed (check)
    ["M3 6.5h11v9H3z", "M14 9.5h3.6l2.4 3v3H14z", "M8 18.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM18 18.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"], // shipping (truck)
    ["M4 11l8-6 8 6", "M6 10.4V19h12v-8.6"],                                 // delivered (home)
  ];
  function stepIcon(i) {
    const s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of STEP_ICON_PATHS[i]) {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d); p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "1.7");
      p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
      s.append(p);
    }
    return s;
  }
  function loadOrders() { try { return JSON.parse(localStorage.getItem("kravr-orders")) || []; } catch (e) { return []; } }
  function saveOrders(o) { try { localStorage.setItem("kravr-orders", JSON.stringify(o)); } catch (e) {} }
  function orderStage(placedAt) { const s = (Date.now() - placedAt) / 1000; let st = 0; for (let i = 0; i < STAGE_SECONDS.length; i++) if (s >= STAGE_SECONDS[i]) st = i; return st; }
  function fmtDate(ms) { try { return new Date(ms).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function buildStepper(stage) {
    return el("div", { class: "stepper" }, STEP_LABELS.map((label, i) =>
      el("div", { class: "step" + (i < stage ? " done" : i === stage ? " active" : "") + (i <= stage ? " reached" : "") }, [
        el("div", { class: "step__dot" }, [i < stage ? svgIcon("check") : stepIcon(i)]),
        el("span", { class: "step__label", text: label }),
      ])
    ));
  }
  function trackMeta(order, stage) {
    return el("div", { class: "track__meta" }, [
      el("div", {}, [el("span", { text: "เลขพัสดุ" }), el("strong", { text: order.track })]),
      el("div", {}, [el("span", { text: "สถานะ" }), el("strong", { class: "track__status", text: STEP_LABELS[stage] })]),
      el("div", {}, [el("span", { text: stage >= 3 ? "จัดส่งสำเร็จเมื่อ" : "คาดว่าถึงภายใน" }), el("strong", { text: fmtDate(order.placedAt + 3 * 86400000) })]),
    ]);
  }
  let successTimer = null;
  function renderSuccessTrack(order) {
    const host = $("[data-success-track]");
    const paint = () => { const st = orderStage(order.placedAt); host.replaceChildren(buildStepper(st), trackMeta(order, st)); if (st >= 3) { clearInterval(successTimer); successTimer = null; } };
    paint();
    clearInterval(successTimer); successTimer = setInterval(paint, 1500);
  }

  const ordersModal = $("[data-orders-modal]"), ordersList = $("[data-orders-list]");
  let ordersTimer = null;
  function renderOrders() {
    const orders = loadOrders();
    if (!orders.length) {
      ordersList.replaceChildren(el("div", { class: "orders__empty" }, [
        el("span", { "aria-hidden": "true" }, [svgIcon("heart")]),
        el("p", { text: "ยังไม่มีคำสั่งซื้อ — เริ่มช้อปแล้วสั่งซื้อดูได้เลย" }),
      ]));
      return;
    }
    let anyPending = false;
    ordersList.replaceChildren(...orders.map((o) => {
      const st = orderStage(o.placedAt); if (st < 3) anyPending = true;
      return el("div", { class: "order-card" }, [
        el("div", { class: "order-card__head" }, [
          el("div", {}, [el("strong", { text: o.no }), el("span", { class: "order-card__date", text: fmtDate(o.placedAt) })]),
          el("span", { class: "order-card__pill" + (st >= 3 ? " done" : ""), text: STEP_LABELS[st] }),
        ]),
        buildStepper(st),
        trackMeta(o, st),
        el("div", { class: "order-card__items" }, (o.items || []).slice(0, 5).map((it) =>
          el("div", { class: "order-card__item" }, [it.img ? el("img", { src: it.img, alt: "", loading: "lazy" }) : null, el("span", { text: it.name + " ×" + it.qty })]))),
        el("div", { class: "order-card__foot" }, [el("span", { text: "ยอดรวม" }), el("strong", { text: baht(o.total) })]),
      ]);
    }));
    if (!anyPending) { clearInterval(ordersTimer); ordersTimer = null; }
  }
  function openOrders() {
    if (modal.getAttribute("aria-hidden") === "false") closeCheckout();
    if (cartEl.classList.contains("is-open")) closeCart();
    renderOrders();
    ordersModal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
    clearInterval(ordersTimer); ordersTimer = setInterval(renderOrders, 1500);
  }
  function closeOrders() { ordersModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); clearInterval(ordersTimer); ordersTimer = null; }
  document.querySelectorAll("[data-open-orders]").forEach((b) => b.addEventListener("click", openOrders));
  document.querySelectorAll("[data-close-orders]").forEach((b) => b.addEventListener("click", closeOrders));

  /* ---------- Login / account (simulated) ---------- */
  const DEMO_EMAIL = "demo@kravr.co", DEMO_PASS = "Kravr#2025";
  const loginModal = $("[data-login-modal]"), loginView = $("[data-login-view]"), loginHeading = $("[data-login-heading]");
  const accountBtn = $("[data-open-login]");
  function loadUser() { try { return JSON.parse(localStorage.getItem("kravr-user")) || null; } catch (e) { return null; } }
  function saveUser(u) { try { localStorage.setItem("kravr-user", JSON.stringify(u)); } catch (e) {} }
  function clearUser() { try { localStorage.removeItem("kravr-user"); } catch (e) {} }
  function personSVG() {
    const s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "20"); s.setAttribute("height", "20"); s.setAttribute("aria-hidden", "true");
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", "12"); c.setAttribute("cy", "8"); c.setAttribute("r", "3.6"); c.setAttribute("fill", "none"); c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-width", "1.7");
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", "M5.5 19.5a6.5 6.5 0 0 1 13 0"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "1.7"); p.setAttribute("stroke-linecap", "round");
    s.append(c, p); return s;
  }
  function updateAccountBtn() {
    const u = loadUser();
    accountBtn.classList.toggle("is-auth", !!u);
    accountBtn.setAttribute("aria-label", u ? "บัญชีของ " + u.name : "บัญชีของฉัน / เข้าสู่ระบบ");
    accountBtn.replaceChildren(u ? el("span", { class: "account-btn__ini", text: u.initial }) : personSVG());
  }
  function loginForm() {
    const email = el("input", { type: "email", name: "email", autocomplete: "username", placeholder: "you@email.com", required: true });
    const pass = el("input", { type: "password", name: "password", autocomplete: "current-password", placeholder: "รหัสผ่าน", required: true });
    const err = el("p", { class: "auth-error", hidden: true, role: "alert" });
    const form = el("form", { class: "auth-form", novalidate: true }, [
      el("label", { class: "field" }, [el("span", { text: "อีเมล" }), email]),
      el("label", { class: "field" }, [el("span", { text: "รหัสผ่าน" }), pass]),
      el("label", { class: "auth-remember" }, [el("input", { type: "checkbox", name: "remember", checked: true }), el("span", { text: "จดจำฉันไว้ในระบบ" })]),
      err,
      el("button", { class: "btn btn--block btn--lg", type: "submit", text: "เข้าสู่ระบบ" }),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (email.value.trim().toLowerCase() === DEMO_EMAIL && pass.value === DEMO_PASS) {
        saveUser({ name: "คุณเดโม", email: DEMO_EMAIL, initial: "D" });
        updateAccountBtn(); renderLogin();
        toast("", "ยินดีต้อนรับ, คุณเดโม", "", true);
        setTimeout(closeLogin, 900);
      } else {
        err.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง — ลองใช้บัญชีเดโมด้านล่าง"; err.hidden = false;
      }
    });
    const demo = el("div", { class: "auth-demo" }, [
      el("p", { class: "auth-demo__t", text: "บัญชีสำหรับทดลอง (เดโม)" }),
      el("div", { class: "auth-demo__row" }, [el("span", { text: "อีเมล" }), el("code", { text: DEMO_EMAIL })]),
      el("div", { class: "auth-demo__row" }, [el("span", { text: "รหัสผ่าน" }), el("code", { text: DEMO_PASS })]),
      el("button", { class: "auth-demo__fill", type: "button", text: "กรอกให้อัตโนมัติ", on: { click: () => { email.value = DEMO_EMAIL; pass.value = DEMO_PASS; err.hidden = true; } } }),
    ]);
    const note = el("p", { class: "auth-note", text: "ระบบล็อกอินนี้เป็นการจำลองสำหรับเดโม — ไม่มีการส่งหรือบันทึกข้อมูลไปยังเซิร์ฟเวอร์จริง" });
    return el("div", {}, [form, demo, note]);
  }
  function accountPanel(u) {
    return el("div", { class: "account" }, [
      el("div", { class: "account__avatar", "aria-hidden": "true", text: u.initial }),
      el("p", { class: "account__name", text: u.name }),
      el("p", { class: "account__email", text: u.email }),
      el("button", { class: "btn btn--block btn--lg", type: "button", text: "คำสั่งซื้อของฉัน", on: { click: () => { closeLogin(); openOrders(); } } }),
      el("button", { class: "btn btn--soft btn--block", type: "button", text: "ออกจากระบบ", on: { click: () => { clearUser(); updateAccountBtn(); renderLogin(); toast("", "ออกจากระบบแล้ว", ""); } } }),
    ]);
  }
  function renderLogin() {
    const u = loadUser();
    loginHeading.textContent = u ? "บัญชีของฉัน" : "เข้าสู่ระบบ";
    loginView.replaceChildren(u ? accountPanel(u) : loginForm());
  }
  function openLogin() { if (cartEl.classList.contains("is-open")) closeCart(); renderLogin(); loginModal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); }
  function closeLogin() { loginModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
  accountBtn.addEventListener("click", openLogin);
  document.querySelectorAll("[data-close-login]").forEach((b) => b.addEventListener("click", closeLogin));
  updateAccountBtn();

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
    const colors = ["#b4315a", "#d9668a", "#e8c07d", "#2f9e6f", "#3a3942", "#f0c4d0"];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) frag.append(el("span", { style: { left: Math.random() * 100 + "vw", background: colors[i % colors.length], animationDuration: (2.2 + Math.random() * 1.8) + "s", animationDelay: Math.random() * 0.5 + "s", transform: "translateY(0) rotate(" + Math.random() * 360 + "deg)" } }));
    confettiLayer.replaceChildren(frag);
    setTimeout(() => confettiLayer.replaceChildren(), 4500);
  }
  const search = $("#search");
  if (search) search.addEventListener("input", () => { searchTerm = search.value; renderProducts(); });
  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", () => { const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark"; root.setAttribute("data-theme", next); try { localStorage.setItem("kravr-theme", next); } catch (e) {} });
  const yearEl = $("[data-year]"); if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (detailModal.getAttribute("aria-hidden") === "false") closeDetail();
    else if (loginModal.getAttribute("aria-hidden") === "false") closeLogin();
    else if (ordersModal.getAttribute("aria-hidden") === "false") closeOrders();
    else if (modal.getAttribute("aria-hidden") === "false") closeCheckout();
    else if (cartEl.classList.contains("is-open")) closeCart();
  });

  /* ---------- Init ---------- */
  renderCart();
  loadProducts();
})();
