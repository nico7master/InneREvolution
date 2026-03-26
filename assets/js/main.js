/*
Synchronous by TEMPLATED
templated.co @templatedco
Released for free under the Creative Commons Attribution 3.0 license (templated.co/license)
*/

(function ($) {
var $window = $(window),
$body = $('body'),
settings = {

// Carousels
carousels: {
speed: 4,
fadeIn: true,
fadeDelay: 250
},

};

// Breakpoints.
breakpoints({
wide:      [ '1281px',  '1680px' ],
normal:    [ '961px',   '1280px' ],
narrow:    [ '841px',   '960px'  ],
narrower:  [ '737px',   '840px'  ],
mobile:    [ null,      '736px'  ]
});

// Play initial animations on page load.
$window.on('load', function() {
window.setTimeout(function() {
$body.removeClass('is-preload');
}, 100);
});
// Safety fallback: remove preload after 2.5s even if external resources hang
window.setTimeout(function() { $body.removeClass('is-preload'); }, 2500);

// Dropdowns.
$('#nav > ul').dropotron({
alignment: 'right',
hoverDelay: 350,
hideDelay: 350
});

// Nav Panel.

// Button.
$('<div id="navButton">' +
'<a href="#navPanel" class="toggle"></a>' +
'</div>')
.appendTo($body);

// Panel.
$('<div id="navPanel">' +
'<nav>' +
$('#nav').navList()
+ '</nav>' +
'</div>')
.appendTo($body)
.panel({
delay: 500,
hideOnClick: true,
hideOnSwipe: true,
resetScroll: true,
resetForms: true,
side: 'left',
target: $body,
visibleClass: 'navPanel-visible'
});

// Carousels - DISABLED (Using Swiper.js instead)
/* Original carousel code disabled - Swiper handles this now
$('.carousel').each(function() {

var $t = $(this),
$forward = $('<span class="forward"></span>'),
$backward = $('<span class="backward"></span>'),
$reel = $t.children('.reel'),
$items = $reel.children('article');

var pos = 0,
leftLimit,
rightLimit,
itemWidth,
reelWidth,
timerId;

// Items.
if (settings.carousels.fadeIn) {

$items.addClass('loading');

$t.scrollex({
mode: 'middle',
top: '-20vh',
bottom: '-20vh',
enter: function() {

var timerId,
limit = $items.length - Math.ceil($window.width() / itemWidth);

timerId = window.setInterval(function() {

var x = $items.filter('.loading'),
xf = x.first();

if (x.length <= limit) {

window.clearInterval(timerId);
$items.removeClass('loading');
return;
}

xf.removeClass('loading');

}, settings.carousels.fadeDelay);

}
});

}

// Main.
$t._update = function() {
// MANUAL OFFSET: Adjust this value to shift carousel position
// Negative = shift LEFT, Positive = shift RIGHT
var manualOffset = -50;

// Set initial position to center article 3 (index 2)
itemWidth = $items.first().outerWidth(true);
var articleWidth = $items.first().width(); // Article width without margins
var visualCenterOffset = ($window.width() - articleWidth) / 2 + manualOffset; // Apply manual offset
console.log('DEBUG: itemWidth (with margin):', itemWidth, 'articleWidth (no margin):', articleWidth, 'visualCenterOffset:', visualCenterOffset, 'windowWidth:', $window.width());
pos = -2 * itemWidth + visualCenterOffset; // Use itemWidth for spacing, visualCenterOffset for centering
console.log('Initial position set to center article 3:', pos);
// Adjust limits to allow centering first and last articles
var articleWidth = $items.first().width(); // Article width without margins
var centerOffset = ($window.width() - articleWidth) / 2 + manualOffset; // Apply manual offset
console.log('DEBUG: itemWidth (with margin):', itemWidth, 'articleWidth (no margin):', articleWidth, 'centerOffset:', centerOffset, 'windowWidth:', $window.width());
leftLimit = centerOffset;  // Allow scrolling to center article 0
rightLimit = -((numItems - 1) * itemWidth) + centerOffset;  // Allow scrolling to center last article
console.log('Limits adjusted - leftLimit:', leftLimit, 'rightLimit:', rightLimit, 'centerOffset:', centerOffset);
$t._updatePos();
};

$t._updatePos = function() { $reel.css('transform', 'translate(' + pos + 'px, 0)'); };

// Forward.
$forward
.appendTo($t)
.hide()
.mouseenter(function(e) {
timerId = window.setInterval(function() {
pos -= settings.carousels.speed;

if (pos <= rightLimit) {
window.clearInterval(timerId);
pos = rightLimit;
}

$t._updatePos();
}, 10);
})
.mouseleave(function(e) {
window.clearInterval(timerId);
});

// Backward.
$backward
.appendTo($t)
.hide()
.mouseenter(function(e) {
timerId = window.setInterval(function() {
pos += settings.carousels.speed;

if (pos >= leftLimit) {

window.clearInterval(timerId);
pos = leftLimit;
}

$t._updatePos();

}, 10);
})
.mouseleave(function(e) {
window.clearInterval(timerId);
});

// Jump to article.
$t.on('click', '.article', function(e) {

var target = $(this).attr('href');
if (target.charAt(0) != '#')
return;

e.preventDefault();
e.stopPropagation();

var $targetArticle = $(target);
if ($targetArticle.length) {

// Scroll page to carousel.
$('html, body').animate({
scrollTop: $t.offset().top
}, 500);

// Center article in reel.
itemWidth = $items.first().outerWidth(true);
var articleIndex = $items.index($targetArticle);
var newPos = -articleIndex * itemWidth + ($window.width() - itemWidth) / 2;

// Clamp position within limits.
newPos = Math.min(leftLimit, Math.max(rightLimit, newPos));
pos = newPos;
$t._updatePos();

// Highlight article for 1 second.
$targetArticle.addClass('highlight');
setTimeout(function() {
$targetArticle.removeClass('highlight');
}, 1000);

}

});

// Pagination Dots - positioned after .reel (below images)
var $pagination = $('<ul class="carousel-pagination"></ul>');
var numItems = $items.length;
var $dots = [];

console.log('Creating pagination for', numItems, 'items');

// Create dots for each article
for (var i = 0; i < numItems; i++) {
var $dot = $('<li class="dot"></li>').attr('data-index', i);
$dots.push($dot);
$pagination.append($dot);
}

console.log('Created', $dots.length, 'dots');

// Add pagination after .reel (right below carousel images)
$reel.after($pagination);

console.log('Added pagination to DOM');

// Initialize first article as centered
$items.eq(0).addClass('centered');
console.log('Initialized first article as centered');

// Update active dot based on current carousel position
var updateActiveDot = function() {
var viewportCenter = $window.width() / 2;
var centerPos = -pos + viewportCenter;
var currentIndex = Math.round((centerPos - itemWidth / 2) / itemWidth);

// Ensure currentIndex is within bounds
currentIndex = Math.max(0, Math.min(numItems - 1, currentIndex));

console.log('Updating active dot to index', currentIndex);

// Update dot states
$dots.forEach(function($dot, idx) {
if (idx === currentIndex) {
$dot.addClass('active');
} else {
$dot.removeClass('active');
}
});

// Update centered article - scale the one in center
$items.removeClass('centered');
$items.eq(currentIndex).addClass('centered');
console.log('Centered article:', currentIndex);
};

// Click handler for dots
$pagination.on('click', '.dot', function() {
var index = $(this).data('index');

console.log('Dot clicked, index:', index);

// Calculate new position to center the selected article
// Use articleWidth for true visual center (no margins)
var articleWidth = $items.first().width();
var newPos = -index * itemWidth + ($window.width() - articleWidth) / 2;

// Clamp position within limits
newPos = Math.max(rightLimit, Math.min(leftLimit, newPos));
pos = newPos;

// Smooth transition
$reel.css('transition', 'transform 0.5s ease');
$t._updatePos();

// Remove transition after animation
setTimeout(function() {
$reel.css('transition', '');
}, 500);

// Update active dot
updateActiveDot();
});

// Update active dot on window resize
$window.on('resize', function() {
itemWidth = $items.first().outerWidth(true);
updateActiveDot();
});

// Override _updatePos to also update dots
var originalUpdatePos = $t._updatePos;
$t._updatePos = function() {
originalUpdatePos.call($t);
updateActiveDot();
};

// Init.
$window.on('load', function() {

reelWidth = $reel[0].scrollWidth;

if (browser.mobile) {

$reel
.css('overflow-y', 'hidden')
.css('overflow-x', 'scroll')
.css('white-space', 'nowrap')
.css('word-spacing', '0px')
.children()
.css('display', 'inline-block')
.css('word-spacing', 'initial')
.css('vertical-align', 'top')
.css('margin-right', '1.5rem')
.css('white-space', 'normal');

}
else {

$reel
.css('overflow', 'hidden')
.css('white-space', 'nowrap')
.children()
.css('display', 'inline-block')
.css('vertical-align', 'top')
.css('margin-right', '1.5rem')
.css('white-space', 'normal');

// Step through items.
itemWidth = $items.first().outerWidth(true);
console.log('Item width:', itemWidth);




$window
.on('resize', function() {
reelWidth = $reel[0].scrollWidth;
$t._update();
})
.trigger('resize');

// Show forward/backward buttons only when needed.
$window
.on('resize', function() {
if (rightLimit < 0)
$forward.show();
else
$forward.hide();

if (leftLimit > 0)
$backward.show();
else
$backward.hide();
})
.trigger('resize');

}

// Initial dot state after everything loads
setTimeout(function() {
updateActiveDot();
}, 100);

});

});
*/

})(jQuery);



/* --- Per-section particle canvases ---
 * One canvas per .shared-particles wrapper; theme from data-theme attribute.
 * IntersectionObserver stops RAF when section off-screen (zero idle CPU). */
(function () {
  function palette(theme) {
    if (theme === 'sky')    return ['190,235,255', '132,208,255', '226,248,255'];
    if (theme === 'violet') return ['232,213,255', '198,156,255', '255,221,244'];
    return ['242,235,220', '214,228,202', '234,208,168']; /* earth */
  }

  function getSize(el) {
    /* Try offsetWidth/Height first, fall back to getBoundingClientRect */
    var w = el.offsetWidth || el.getBoundingClientRect().width  || window.innerWidth  || 1;
    var h = el.offsetHeight|| el.getBoundingClientRect().height || window.innerHeight || 1;
    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
  }

  function initSectionCanvas(wrapper) {
    var theme = wrapper.getAttribute('data-theme') || 'earth';
    var canvas = document.createElement('canvas');
    canvas.className = 'shared-particle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    wrapper.insertBefore(canvas, wrapper.firstChild);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = 1, width = 1, height = 1;
    var particles = [], raf = 0, running = false, last = 0;
    var sectionOffset = 0;
    function updateSectionOffset() { sectionOffset = wrapper.getBoundingClientRect().top; }
    window.addEventListener('scroll', updateSectionOffset, { passive: true });

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function particleCount() {
      var mobile = width <= 736;
      var area = Math.max(1, width * height);
      var scaled = Math.round(area / (mobile ? 50000 : 34000));
      return Math.max(mobile ? 10 : 36, Math.min(mobile ? 18 : 56, scaled)); /* mobile: max 18 */
    }

    function makeParticle(initial) {
      var colors = palette(theme);
      var mobile = width <= 736;
      return {
        x:       rand(-0.08 * width, 1.08 * width),
        y:       initial ? rand(0, height) : rand(height * 0.7, height * 1.12),
        radius:  Math.random() < 0.18 ? rand(mobile ? 3.0 : 4.0, mobile ? 4.5 : 5.5)
                                       : rand(1.8, mobile ? 3.2 : 4.2),
        alpha:   rand(0.45, 0.80),   /* boosted for visibility */
        rise:    rand(5.5, 11.5),
        ampX:    rand(18, 46),
        ampY:    rand(6, 16),
        speed:   rand(0.00028, 0.00065),
        phase:   rand(0, Math.PI * 2),
        phase2:  rand(0, Math.PI * 2),
        twinkle: rand(0.00045, 0.0011),
        hue:     colors[Math.floor(Math.random() * colors.length)]
      };
    }

    function applySize(w, h) {
      width  = w; height = h;
      dpr    = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width  = Math.round(width  * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: particleCount() }, function () {
        return makeParticle(true);
      });
    }

    function resize() {
      var sz = getSize(wrapper);
      applySize(sz.w, sz.h);
    }

    function step(now) {
      if (!running) return;
      if (!last) last = now;
      /* 30fps cap on mobile — halves GPU load */
      var mobile = width <= 736;
      if (mobile && now - last < 33) { raf = window.requestAnimationFrame(step); return; }
      var dt = Math.min(32, now - last); last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(0, -sectionOffset);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y -= p.rise * (dt / 1000);
        if (p.y < -24) particles[i] = p = makeParticle(false);
        var wave  = now * p.speed;
        var x     = p.x + Math.sin(wave + p.phase) * p.ampX + Math.sin(wave * 0.53 + p.phase2) * (p.ampX * 0.45);
        var y     = p.y + Math.cos(wave * 0.7  + p.phase) * p.ampY;
        var alpha = p.alpha * (0.72 + Math.sin(now * p.twinkle + p.phase2) * 0.28);
        /* glow halo */
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.hue + ',' + Math.max(0.04, alpha * 0.20).toFixed(3) + ')';
        ctx.arc(x, y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        /* core */
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.hue + ',' + Math.max(0.10, alpha).toFixed(3) + ')';
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      raf = window.requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      /* Ensure canvas has real dimensions before starting */
      var sz = getSize(wrapper);
      if (sz.w !== width || sz.h !== height || !particles.length) applySize(sz.w, sz.h);
      updateSectionOffset();
      running = true; last = 0;
      raf = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }

    /* IntersectionObserver: start/stop when entering/leaving viewport */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) start(); else stop();
        });
      }, { rootMargin: '200px' });
      io.observe(wrapper);
    } else {
      /* Fallback: always run */
      resize(); start();
    }

    /* Re-measure on resize */
    window.addEventListener('resize', function () {
      if (running) { resize(); updateSectionOffset(); }
    }, { passive: true });

    /* Ensure proper dimensions after full page load */
    window.addEventListener('load', function () {
      var sz = getSize(wrapper);
      applySize(sz.w, sz.h);
      if (!running) start();
    });
  }

  function initSharedParticles() {
    /* Skip entirely on mobile — too heavy for small screens */
    if (window.innerWidth <= 980) return;
    /* Skip if FPS watcher detected low performance */
    if (window._particlesDisabled) return;
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var slowConn = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType));
    if (prefersReduced || slowConn) return; /* skip particles on reduced-motion / slow connections */
    var wrappers = document.querySelectorAll('.shared-particles');
    for (var i = 0; i < wrappers.length; i++) {
      initSectionCanvas(wrappers[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedParticles);
  } else {
    initSharedParticles();
  }
})();
/* --- End per-section particle canvases --- */

/* --- Upcoming programs feed (Google Sheets) --- */
(function () {
  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  /* Google Sheets serial date → "YYYY-MM-DD" */
  function serialToISO(serial) {
    if (!serial && serial !== 0) return '';
    if (typeof serial === 'string') return serial.substring(0, 10);
    var d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }

  /* Google Sheets serial time fraction → "HH:MM" */
  function serialToTime(frac) {
    if (!frac && frac !== 0) return '';
    if (typeof frac === 'string') return frac.substring(0, 5);
    var totalMins = Math.round(frac * 24 * 60);
    var h = Math.floor(totalMins / 60);
    var m = totalMins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function formatDate(raw) {
    if (!raw) return '';
    var d = new Date(raw.indexOf('T') !== -1 ? raw : raw + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fetchSheet(range) {
    var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + CONFIG.SHEET_ID +
              '/values/' + encodeURIComponent(range) +
              '?key=' + CONFIG.SHEETS_API_KEY +
              '&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';
    // 5-second timeout — prevents infinite spinner when API key blocks localhost
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;
    var opts = controller ? { signal: controller.signal } : {};
    return fetch(url, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('Sheets API ' + res.status + ' — check API key referrer restrictions');
      return res.json();
    }).then(function (data) { return data.values || []; })
    .catch(function (err) {
      if (timer) clearTimeout(timer);
      throw err; // re-throw so Promise.all catch handles it
    });
  }

  function buildProgramCard(program, sessions) {
    var isFull   = program.spotsLeft <= 0;
    var card     = createElement('article', 'program-card swiper-slide' + (isFull ? ' is-full' : ''));
    var header   = createElement('div', 'program-card-header');
    var title    = createElement('h3', '', program.name || 'Upcoming program');
    var dateText = createElement('p', 'program-card-date');
    dateText.textContent = program.startDate
      ? formatDate(program.startDate) + (program.endDate && program.endDate !== program.startDate ? ' \u2013 ' + formatDate(program.endDate) : '')
      : 'Date coming soon';
    header.appendChild(title);
    header.appendChild(dateText);
    card.appendChild(header);

    /* Meta bubbles: format / language / level / location */
    var metaList = createElement('ul', 'program-card-meta');
    var hasMeta  = false;
    if (program.format)   { hasMeta = true; metaList.appendChild(createElement('li', 'program-card-format', program.format)); }
    if (program.language) {
      hasMeta = true;
      var langLi = createElement('li', 'program-card-lang', program.language);
      langLi.setAttribute('data-lang', program.language.toLowerCase());
      metaList.appendChild(langLi);
    }
    if (program.location) { hasMeta = true; metaList.appendChild(createElement('li', 'program-card-location', program.location)); }
    if (hasMeta) card.appendChild(metaList);

    /* Description */
    if (program.description) card.appendChild(createElement('p', 'program-card-summary', program.description));

    /* Footer: price + spots + CTA */
    var footer = createElement('div', 'program-card-actions');
    footer.appendChild(createElement('span', isFull ? 'program-card-note' : 'program-card-note',
      isFull ? 'Sold out' : program.spotsLeft + ' spot' + (program.spotsLeft === 1 ? '' : 's') + ' left'));

    var btn = document.createElement('a');
    btn.className = 'button hatha-button program-register-button';
    if (isFull) {
      btn.textContent       = 'Sold Out';
      btn.setAttribute('aria-disabled', 'true');
      btn.style.opacity     = '0.55';
      btn.style.pointerEvents = 'none';
    } else {
      btn.textContent = 'Book Now';
      btn.href        = '/booking/?program=' + encodeURIComponent(program.id);
    }
    footer.appendChild(btn);
    card.appendChild(footer);
    return card;
  }

  function refreshParticles() {
    function emit() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { emit(); setTimeout(emit, 160); setTimeout(emit, 420); });
    } else { emit(); setTimeout(emit, 160); setTimeout(emit, 420); }
  }

  function initProgramsFeed() {
    var feed = document.querySelector('[data-programs-feed]');
    if (!feed) return;
    var status = feed.querySelector('[data-programs-status]');
    var list   = feed.querySelector('[data-programs-list]');
    if (!status || !list) return;

    /* Graceful fallback: CONFIG not available — load static programs.json */
    if (typeof CONFIG === 'undefined' || !CONFIG.SHEET_ID || !CONFIG.SHEETS_API_KEY) {
      var feedUrl = feed.getAttribute('data-programs-feed');
      if (!feedUrl) { status.textContent = 'Programs coming soon.'; return; }
      fetch(feedUrl, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (payload) {
          var programs = (payload.programs || []).filter(function (p) {
            return p && p.start && (p.status || '').toLowerCase() !== 'cancelled';
          });
          status.textContent = programs.length ? '' : 'No programs listed yet.';
          programs.slice(0, 6).forEach(function (p) {
            /* Build full card from calendar JSON format */
            var card = createElement('article', 'program-card swiper-slide');

            /* Header: title + date */
            var header = createElement('div', 'program-card-header');
            header.appendChild(createElement('h3', '', p.title || 'Upcoming program'));
            var dateEl = createElement('p', 'program-card-date');
            if (p.start) {
              var startD = new Date(p.start);
              var dateStr = startD.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              if (p.end) {
                var endD = new Date(p.end);
                var startDay = startD.toDateString();
                var endDay = endD.toDateString();
                if (startDay !== endDay) {
                  dateStr += ' – ' + endD.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                }
              }
              dateEl.textContent = dateStr;
            } else {
              dateEl.textContent = 'Date coming soon';
            }
            header.appendChild(dateEl);
            card.appendChild(header);

            /* Meta bubbles: format / language / location */
            var metaList = createElement('ul', 'program-card-meta');
            var hasMeta = false;
            if (p.format)   { hasMeta = true; metaList.appendChild(createElement('li', 'program-card-format', p.format)); }
            if (p.language) {
              hasMeta = true;
              var langLi = createElement('li', 'program-card-lang', p.language);
              langLi.setAttribute('data-lang', p.language.toLowerCase());
              metaList.appendChild(langLi);
            }
            if (p.location) { hasMeta = true; metaList.appendChild(createElement('li', 'program-card-location', p.location)); }
            if (hasMeta) card.appendChild(metaList);

            /* Description / summary */
            if (p.summary) card.appendChild(createElement('p', 'program-card-summary', p.summary));

            /* Footer: Book Now button */
            var footer = createElement('div', 'program-card-actions');
            var btn = document.createElement('a');
            btn.className = 'button hatha-button program-register-button';
            btn.textContent = 'Book Now';
            btn.href = p.registrationUrl || '/booking/';
            btn.target = '_blank';
            btn.rel = 'noopener';
            footer.appendChild(btn);
            card.appendChild(footer);

            list.appendChild(card);
          });
          refreshParticles();
          setTimeout(function () {
            if (window._programsSwiper) { window._programsSwiper.destroy(true, true); window._programsSwiper = null; }
            window._programsSwiper = new Swiper('.programsSwiper', {
              slidesPerView: 'auto',
              spaceBetween: 16,
              grabCursor: true,
              speed: 400,
              centerInsufficientSlides: true,
              pagination: { el: '.programs-pagination', clickable: true },
            });
          }, 80);
        })
        .catch(function () { status.textContent = 'Programs will appear here soon.'; refreshParticles(); });
      return;
    }

    /* Main path: read from Google Sheets */
    Promise.all([
      fetchSheet('Programs!A2:O'),
      fetchSheet('Sessions!A2:G')
    ]).then(function (results) {
      var progRows = results[0];
      var sessRows = results[1];

      var programs = progRows.map(function (r) {
        return {
          id:          (r[0]  || '').toString().trim(),
          name:        r[1]  || '',
          price:       parseFloat(r[2]) || 0,
          spotsTotal:  parseInt(r[3])   || 0,
          spotsLeft:   parseInt(r[4])   || 0,
          active:      ['TRUE','YES','1'].indexOf((r[5]  || '').toString().toUpperCase().trim()) !== -1,
          startDate:   serialToISO(r[6]  || ''),
          endDate:     serialToISO(r[7]  || ''),
          description: r[9]  || '',
          location:    r[10] || '',
          language:    r[11] || '',
          format:      r[13] || '',  // col N (Level removed)
        };
      }).filter(function (p) { return p.active && p.id; }).slice(0, 6);

      var sessions = sessRows.map(function (r) {
        return {
          programId: (r[0] || '').toString().trim(),
          sessionNum: parseInt(r[1]) || 0,
          date:      serialToISO(r[2] || ''),
          timeStart: serialToTime(r[3] || ''),
          timeEnd:   serialToTime(r[4] || ''),
          notes:     r[5] || '',
        };
      });

      list.innerHTML = '';

      if (!programs.length) {
        status.textContent = 'No programs are currently available. Check back soon!';
        refreshParticles();
        return;
      }

      status.textContent = '';
      programs.forEach(function (p) { list.appendChild(buildProgramCard(p, sessions)); });
      refreshParticles();

      setTimeout(function () {
        if (window._programsSwiper) { window._programsSwiper.destroy(true, true); window._programsSwiper = null; }
        window._programsSwiper = new Swiper('.programsSwiper', {
          slidesPerView: 'auto',
          spaceBetween: 16,
          grabCursor: true,
          speed: 400,
          centerInsufficientSlides: true,
          pagination: { el: '.programs-pagination', clickable: true },
        });
      }, 80);

    }).catch(function (err) {
      console.error('[Programs feed] Sheets error:', err);
      status.textContent = 'Programs will appear here soon.';
      refreshParticles();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgramsFeed);
  } else {
    initProgramsFeed();
  }
})();
/* --- End upcoming programs feed --- */


// Keep Programs particles synced to the full rendered section height.
(function () {
  function emitProgramsParticleResize() {
    try {
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
      var resizeEvent = document.createEvent('Event');
      resizeEvent.initEvent('resize', true, true);
      window.dispatchEvent(resizeEvent);
    }
  }

  function scheduleProgramsParticleResize() {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        emitProgramsParticleResize();
        setTimeout(emitProgramsParticleResize, 120);
        setTimeout(emitProgramsParticleResize, 360);
        setTimeout(emitProgramsParticleResize, 900);
      });
      return;
    }

    emitProgramsParticleResize();
    setTimeout(emitProgramsParticleResize, 120);
    setTimeout(emitProgramsParticleResize, 360);
    setTimeout(emitProgramsParticleResize, 900);
  }

  function initProgramsParticleObserver() {
    var section = document.querySelector('#program-calendar.shared-particles');
    if (!section) return;

    scheduleProgramsParticleResize();
    window.addEventListener('load', scheduleProgramsParticleResize);

    if ('ResizeObserver' in window) {
      var resizeObserver = new ResizeObserver(function () {
        scheduleProgramsParticleResize();
      });
      resizeObserver.observe(section);
    }

    var feed = section.querySelector('.programs-feed');
    if (feed && 'MutationObserver' in window) {
      var mutationObserver = new MutationObserver(function () {
        scheduleProgramsParticleResize();
      });
      mutationObserver.observe(feed, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgramsParticleObserver);
  } else {
    initProgramsParticleObserver();
  }
})();


  /* ============================================================
     Contact section – Email copy & reveal
     ============================================================ */
  (function initContactEmail() {
    var EMAIL = 'innerevolutionyoga.life@gmail.com';
    var copyBtn    = document.getElementById('copyEmailBtn');
    var revealBox  = document.getElementById('emailReveal');
    var addressEl  = document.getElementById('emailAddress');
    var copyAgain  = document.getElementById('copyAgainBtn');
    var statusEl   = document.getElementById('emailStatus');
    var hideTimer  = null;

    if (!copyBtn) return;

    function copyToClipboard() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).then(showCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = EMAIL;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showCopied(); }
      catch(e) { statusEl.textContent = 'Could not copy'; }
      document.body.removeChild(ta);
    }

    function showCopied() {
      revealBox.classList.add('visible');
      statusEl.textContent = 'Copied!';
      statusEl.classList.add('show');

      /* Hide "Copied!" text after 2.2s */
      setTimeout(function() {
        statusEl.classList.remove('show');
      }, 2200);

      /* Auto-hide email reveal after 6s */
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        revealBox.classList.remove('visible');
        revealBox.classList.add('hiding');
        setTimeout(function() {
          revealBox.classList.remove('hiding');
        }, 400);
      }, 6000);
    }

    copyBtn.addEventListener('click', function() {
      copyToClipboard();
    });

    copyAgain.addEventListener('click', function() {
      copyToClipboard();
    });
  })();

/* ─── Readings (Interesting reads) Swiper ─── */
document.addEventListener('DOMContentLoaded', function () {
  new Swiper('.readingsSwiper', {
    slidesPerView: 'auto',      /* card width fixed in CSS */
    spaceBetween: 16,           /* breathing room between cards */
    grabCursor: true,
    speed: 400,
    centerInsufficientSlides: true, /* center when fewer cards than fill row */
    pagination: { el: '.readings-pagination', clickable: true },
  });
});

/* ============================================================
   NAVBAR v7 — scroll-up show / scroll-down hide
   .navbar-visible toggled on .navbar-wrapper#navbar
   ============================================================ */
(function() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  var lastScrollY = window.scrollY;
  var ticking = false;

  // Visible at page top
  if (lastScrollY < 60) {
    navbar.classList.add('navbar-visible');
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        var currentScrollY = window.scrollY;
        var delta = currentScrollY - lastScrollY;

        if (currentScrollY < 60) {
          // At top of page — always show
          navbar.classList.add('navbar-visible');
        } else if (delta < -8) {
          // Scrolling UP — show
          navbar.classList.add('navbar-visible');
        } else if (delta > 8) {
          // Scrolling DOWN — hide
          navbar.classList.remove('navbar-visible');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();
/* === END NAVBAR v7 JS === */


// =============================================
// HERO PARTICLES: Pause when scrolled out of view
// Handles both SVG SMIL (desktop) + CSS wind-track
// =============================================
(function() {
    var header = document.querySelector('#header') || document.querySelector('header');
    var svg = document.querySelector('.cyan-wind-trail svg');
    var windTrack = document.querySelector('.wind-track');

    if (!header) return;

    window._heroVisible = true; // shared flag for bloomLoop in index.html

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                // Hero in view — resume everything
                window._heroVisible = true;
                if (svg) svg.unpauseAnimations();
                if (windTrack) windTrack.classList.remove('paused');
                if (header) header.classList.remove('hero-paused'); // resume dust motes via CSS
            } else {
                // Hero out of view — pause everything
                window._heroVisible = false;
                if (svg) svg.pauseAnimations();
                if (windTrack) windTrack.classList.add('paused');
                if (header) header.classList.add('hero-paused'); // pause dust motes via CSS
            }
        });
    }, { threshold: 0.15 });

    observer.observe(header);

  /* ---- Rolling FPS watcher ----------------------------------------
   * Starts after 3s warmup (hero particles settled).
   * Samples FPS every 2 seconds. If 2 consecutive samples are below
   * THRESHOLD, all section particle canvases are removed and flagged
   * so new ones are never created.
   * Does NOT affect hero particles.
   * ----------------------------------------------------------------- */
  (function fpsGuard() {
    var THRESHOLD      = 30;    /* fps floor */
    var SAMPLE_MS      = 2000;  /* measure window per sample */
    var WARMUP_MS      = 3000;  /* wait before first sample */
    var BAD_SAMPLES    = 2;     /* consecutive bad samples before disabling */
    var badCount       = 0;
    var frameCount     = 0;
    var sampleStart    = null;
    var rafId          = null;

    function disableParticles() {
      window._particlesDisabled = true;
      /* Remove any already-running canvases */
      var canvases = document.querySelectorAll('.shared-particles .shared-particle-canvas');
      canvases.forEach(function(c) {
        c.style.display    = 'none';
        c.style.visibility = 'hidden';
      });
      /* Switch fixed backgrounds to scroll — prevents full repaints on low-end devices */
      document.body.classList.add('low-fps');
      cancelAnimationFrame(rafId);
    }

    function tick(now) {
      if (!sampleStart) sampleStart = now;
      frameCount++;
      var elapsed = now - sampleStart;

      if (elapsed >= SAMPLE_MS) {
        var fps = (frameCount / elapsed) * 1000;
        if (fps < THRESHOLD) {
          badCount++;
          if (badCount >= BAD_SAMPLES) {
            disableParticles();
            return; /* stop RAF loop */
          }
        } else {
          badCount = 0; /* reset on good sample */
        }
        frameCount  = 0;
        sampleStart = now;
      }

      rafId = requestAnimationFrame(tick);
    }

    /* Only run on non-mobile (mobile already hides canvases via CSS) */
    if (window.innerWidth > 980) {
      setTimeout(function() {
        rafId = requestAnimationFrame(tick);
      }, WARMUP_MS);
    }
  })();
})();
