/* Kravr login (simulated). Verifies the demo credentials, stores a local
   session, then sends the user to the chooser hub. No real auth. */
"use strict";

(function () {
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const DEMO_EMAIL = "demo@kravr.co", DEMO_PASS = "Kravr#2025";

  // Theme toggle (shared key with the rest of the app)
  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("kravr-theme", n); } catch (e) {}
  });

  // Already signed in → skip straight to the hub
  try { if (localStorage.getItem("kravr-user")) { location.replace("home.html"); return; } } catch (e) {}

  const form = $("[data-login-form]"), err = $("[data-login-error]");
  const email = form.elements.email, pass = form.elements.password;

  const fill = $("[data-demo-fill]");
  if (fill) fill.addEventListener("click", () => { email.value = DEMO_EMAIL; pass.value = DEMO_PASS; err.hidden = true; email.focus(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (email.value.trim().toLowerCase() === DEMO_EMAIL && pass.value === DEMO_PASS) {
      try { localStorage.setItem("kravr-user", JSON.stringify({ name: "คุณเดโม", email: DEMO_EMAIL, initial: "D" })); } catch (e) {}
      location.href = "home.html";
    } else {
      err.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง — ลองใช้บัญชีเดโมด้านล่าง";
      err.hidden = false;
    }
  });
})();
