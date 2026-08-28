/* ============================================================
   Scroll-aware topbar — shared site-wide.
   Targets: .wisdom-topbar (Wisdom pages), .booking-tosite-btn (Booking).
   Visible at page top; hides on scroll down (>8px), reappears on
   scroll up (>8px). Mirrors homepage NAVBAR v7.
   rAF-throttled, passive listener — no layout thrashing, no loops.
   ============================================================ */
(function() {
  var bars = document.querySelectorAll('.wisdom-topbar, .booking-tosite-btn');
  if (!bars.length) return;

  var lastScrollY = window.scrollY;
  var ticking = false;

  function setState(hidden) {
    for (var i = 0; i < bars.length; i++) {
      bars[i].classList.toggle('topbar-hidden', hidden);
    }
  }

  // Visible at page top; start hidden if page loads already scrolled
  setState(lastScrollY >= 60);

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        var currentScrollY = window.scrollY;
        var delta = currentScrollY - lastScrollY;

        if (currentScrollY < 60) {
          setState(false);   // At top of page — always show
        } else if (delta < -8) {
          setState(false);   // Scrolling UP — show
        } else if (delta > 8) {
          setState(true);    // Scrolling DOWN — hide
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ============================================================
   Language pill (homepages) — visible ONLY while at page top.
   Position-based (not direction-based): once you scroll past the
   top it stays hidden until you return to the very top.
   ============================================================ */
(function() {
  var pill = document.getElementById('langPill');
  if (!pill) return;

  var ticking = false;

  function update() {
    pill.classList.toggle('lang-pill-hidden', window.scrollY >= 60);
    ticking = false;
  }

  update();

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();
