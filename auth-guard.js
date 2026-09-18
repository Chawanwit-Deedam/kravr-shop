/* Redirects to the login page when no (simulated) session exists.
   Runs before paint so protected pages never flash. Client-side only —
   this is a demo flow, not real authentication. */
(function () {
  "use strict";
  try {
    if (!localStorage.getItem("kravr-user")) location.replace("index.html");
  } catch (e) {}
})();
