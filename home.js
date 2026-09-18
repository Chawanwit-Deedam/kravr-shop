/* Kravr hub — greets the signed-in (simulated) user and handles sign-out. */
"use strict";

(function () {
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);

  let user = null;
  try { user = JSON.parse(localStorage.getItem("kravr-user")); } catch (e) {}
  const nameEl = $("[data-user-name]");
  if (nameEl && user && user.name) nameEl.textContent = user.name;

  const logout = $("[data-logout]");
  if (logout) logout.addEventListener("click", () => {
    try { localStorage.removeItem("kravr-user"); } catch (e) {}
    location.replace("index.html");
  });

  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("kravr-theme", n); } catch (e) {}
  });
})();
