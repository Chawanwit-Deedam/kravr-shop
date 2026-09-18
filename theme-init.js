/* Sets theme before first paint (no flash). External file → CSP-safe. */
(function () {
  "use strict";
  var root = document.documentElement;
  try {
    var t = localStorage.getItem("kravr-theme");
    if (t !== "dark" && t !== "light") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    root.setAttribute("data-theme", t);
  } catch (e) {
    root.setAttribute("data-theme", "light");
  }
})();
