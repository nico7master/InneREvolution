/*
 * quote-fit.js — per-quote optimal font size for the banner quotes.
 *
 * One global font size can never both be large and keep every designed
 * line cut: the longest quote line simply does not fit at the classic
 * size. This script scales EACH quote individually so its widest
 * designed line (<br> segment) exactly fills the available width,
 * capped at the classic 2rem look:
 *
 *   - short quotes render at the full classic size (2rem)
 *   - long quotes get the largest size at which their cut still holds
 *
 * The CSS cqi rule stays as the no-JS fallback; below 737px the mobile
 * CSS rules own the size and this script stays out of the way.
 */
(function () {
  'use strict';

  var CAP = 32;           // px — the classic 1.75em-era quote size
  var MIN_VIEWPORT = 737; // below this, mobile CSS owns the font size

  function fitQuote(h2) {
    if (window.innerWidth < MIN_VIEWPORT) {
      h2.style.removeProperty('font-size');
      return;
    }

    var cs = getComputedStyle(h2);
    // Available width = container content width minus both quote marks and gaps
    // (the text block itself is fit-content, so its own width follows the font)
    var cont = h2.closest('.quote-container') || h2.parentElement;
    var ccw = cont.clientWidth;
    var ccs = getComputedStyle(cont);
    var cpad = (parseFloat(ccs.paddingLeft) || 0) + (parseFloat(ccs.paddingRight) || 0);
    var gap = parseFloat(ccs.columnGap || ccs.gap) || 0;
    var avail = ccw - cpad;
    var startImg = cont.querySelector('.quote-start');
    var endImg = cont.querySelector('.quote-end');
    if (startImg) avail -= startImg.getBoundingClientRect().width + gap;
    if (endImg) avail -= endImg.getBoundingClientRect().width + gap;
    if (avail <= 0) avail = h2.clientWidth - ((parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0));
    var current = parseFloat(cs.fontSize);
    if (!avail || !current) return; // not laid out yet — retry on next pass

    // Probe span inherits the h2's exact font for true text measurement
    var probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0;';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontStyle = cs.fontStyle;
    probe.style.fontSize = current + 'px';
    probe.style.letterSpacing = cs.letterSpacing;
    document.body.appendChild(probe);

    // Measure every designed segment (text between <br> tags) at the
    // current size; text width scales linearly with font size, so one
    // reference measurement is exact.
    var maxW = 0;
    for (var i = 0; i < h2.childNodes.length; i++) {
      var n = h2.childNodes[i];
      if (n.nodeType !== 3) continue; // only text nodes; <br> separates them
      var t = n.textContent.trim();
      if (!t) continue;
      probe.textContent = t;
      var w = probe.getBoundingClientRect().width;
      if (w > maxW) maxW = w;
    }
    probe.remove();
    if (!maxW) return;

    // Largest size at which the widest segment still fits, capped
    var size = Math.min(CAP, current * (avail / maxW));
    size = Math.floor(size * 10) / 10;

    // Inline !important — beats the stylesheet's !important fallback rule
    h2.style.setProperty('font-size', size + 'px', 'important');
  }

  function fitAll() {
    var quotes = document.querySelectorAll('.banner .quote-text h2');
    for (var i = 0; i < quotes.length; i++) fitQuote(quotes[i]);
  }

  function run() {
    requestAnimationFrame(fitAll);
  }

  // Measure only after the real webfont is active (fallback metrics lie)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run);
  }
  window.addEventListener('load', run); // safety second pass after layout

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(run, 150);
  });
})();
