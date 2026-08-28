/* ============================================================
   Wisdom topbar — scroll-down hide / scroll-up show
   Mirrors homepage NAVBAR v7: visible at page top, hides after
   scrolling down >8px, reappears on any scroll up >8px.
   rAF-throttled, passive listener — no layout thrashing.
   ============================================================ */
(function() {
  var topbar = document.querySelector('.wisdom-topbar');
  if (!topbar) return;

  var lastScrollY = window.scrollY;
  var ticking = false;

  // Visible at page top
  if (lastScrollY < 60) {
    topbar.classList.remove('topbar-hidden');
  } else {
    topbar.classList.add('topbar-hidden');
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        var currentScrollY = window.scrollY;
        var delta = currentScrollY - lastScrollY;

        if (currentScrollY < 60) {
          // At top of page — always show
          topbar.classList.remove('topbar-hidden');
        } else if (delta < -8) {
          // Scrolling UP — show
          topbar.classList.remove('topbar-hidden');
        } else if (delta > 8) {
          // Scrolling DOWN — hide
          topbar.classList.add('topbar-hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();
