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

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function particleCount() {
      var mobile = width <= 736;
      var area = Math.max(1, width * height);
      var scaled = Math.round(area / (mobile ? 50000 : 34000));
      return Math.max(mobile ? 20 : 36, Math.min(mobile ? 32 : 56, scaled));
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
      var dt = Math.min(32, now - last); last = now;
      ctx.clearRect(0, 0, width, height);
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
      raf = window.requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      /* Ensure canvas has real dimensions before starting */
      var sz = getSize(wrapper);
      if (sz.w !== width || sz.h !== height || !particles.length) applySize(sz.w, sz.h);
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
      if (running) resize();
    }, { passive: true });

    /* Ensure proper dimensions after full page load */
    window.addEventListener('load', function () {
      var sz = getSize(wrapper);
      applySize(sz.w, sz.h);
      if (!running) start();
    });
  }

  function initSharedParticles() {
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

/* --- Upcoming programs feed --- */
(function () {
  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function formatProgramDate(program) {
    if (!program || !program.start) return 'Date coming soon';

    var startDate = new Date(program.start);
    if (isNaN(startDate.getTime())) return 'Date coming soon';

    var timeZone = program.timezone || undefined;
    var dateFormatter = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: timeZone
    });

    if (program.allDay) {
      return dateFormatter.format(startDate);
    }

    var timeFormatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone
    });

    var timeText = timeFormatter.format(startDate);

    if (program.end) {
      var endDate = new Date(program.end);
      if (!isNaN(endDate.getTime())) {
        timeText += ' – ' + timeFormatter.format(endDate);
      }
    }

    return dateFormatter.format(startDate) + '<br>' + timeText;
  }

  function buildProgramCard(program, fallbackCalendarUrl) {
    var card = createElement('article', 'program-card swiper-slide'); /* swiper-slide enables Swiper drag-scroll */
    var cardHeader = createElement('div', 'program-card-header');
    var dateText = createElement('p', 'program-card-date');
    dateText.innerHTML = formatProgramDate(program);
    var title = createElement('h3', '', program.title || 'Upcoming program');

    cardHeader.appendChild(dateText);
    cardHeader.appendChild(title);
    card.appendChild(cardHeader);

    var metaItems = [];
    if (program.format) metaItems.push(program.format);
    if (program.location) metaItems.push(program.location);

    if (metaItems.length) {
      var metaList = createElement('ul', 'program-card-meta');

      /* Format li with icon (online = globe, in-person = crowd) */
      if (program.format) {
        var formatLi = createElement('li', '');
        var isOnline   = /online|virtual/i.test(program.format);
        var isInPerson = /in.?person|physical|studio/i.test(program.format);
        var iconSrc = isOnline   ? 'SVGs/world-wide-web-black-internet-connection-symbol-17711.svg'
                    : isInPerson ? 'SVGs/black-crowd-or-group-of-people-19859.svg'
                    : null;
        if (iconSrc) {
          var fmtIcon = document.createElement('img');
          fmtIcon.src = iconSrc;
          fmtIcon.className = 'program-card-meta-icon';
          fmtIcon.alt = '';
          formatLi.appendChild(fmtIcon);
        }
        formatLi.appendChild(document.createTextNode(program.format));
        metaList.appendChild(formatLi);
      }

      /* Location li with pin icon */
      if (program.location) {
        var locationLi = createElement('li', 'program-card-location');
        var pinIcon = document.createElement('img');
        pinIcon.src = 'SVGs/pin-48.svg';
        pinIcon.className = 'program-card-meta-icon';
        pinIcon.alt = '';
        locationLi.appendChild(pinIcon);
        locationLi.appendChild(document.createTextNode(program.location));
        metaList.appendChild(locationLi);
      }

      card.appendChild(metaList);
    }

    if (program.summary) {
      card.appendChild(createElement('p', 'program-card-summary', program.summary));
    }

    var footer = createElement('div', 'program-card-actions');

    if (program.registrationUrl) {
      var registerButton = createElement('a', 'button hatha-button program-register-button', program.registrationLabel || 'Register');
      registerButton.href = program.registrationUrl;
      registerButton.target = '_blank';
      registerButton.rel = 'noopener';
      footer.appendChild(registerButton);
    } else {
      footer.appendChild(createElement('span', 'program-card-note', 'Add your Google Form link to open registration.'));
    }

    var calendarUrl = program.calendarUrl || fallbackCalendarUrl;
    if (calendarUrl) {
      var calendarLink = createElement('a', 'program-inline-link', 'Open in Calendar');
      calendarLink.href = calendarUrl;
      calendarLink.target = '_blank';
      calendarLink.rel = 'noopener';
      footer.appendChild(calendarLink);
    }

    card.appendChild(footer);
    return card;
  }

  function initProgramsFeed() {
    var feed = document.querySelector('[data-programs-feed]');
    if (!feed) return;

    var status = feed.querySelector('[data-programs-status]');
    var list = feed.querySelector('[data-programs-list]');
    var calendarLink = document.querySelector('[data-programs-calendar-link]');
    var feedUrl = feed.getAttribute('data-programs-feed');

    if (!feedUrl || !status || !list) return;

    function refreshProgramsParticles() {
      function emitResize() {
        try {
          window.dispatchEvent(new Event('resize'));
        } catch (error) {
          var resizeEvent = document.createEvent('Event');
          resizeEvent.initEvent('resize', true, true);
          window.dispatchEvent(resizeEvent);
        }
      }

      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () {
          emitResize();
          setTimeout(emitResize, 160);
          setTimeout(emitResize, 420);
        });
        return;
      }

      emitResize();
      setTimeout(emitResize, 160);
      setTimeout(emitResize, 420);
    }

    fetch(feedUrl, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load programs feed.');
        return response.json();
      })
      .then(function (payload) {
        var programs = Array.isArray(payload.programs) ? payload.programs.slice() : [];
        var meta = payload.meta || {};
        var fallbackCalendarUrl = meta.calendarUrl || (calendarLink ? calendarLink.href : '');
        var now = Date.now();

        if (calendarLink && meta.calendarUrl) {
          calendarLink.href = meta.calendarUrl;
        }

        programs = programs.filter(function (program) {
          if (!program || !program.start) return false;
          if ((program.status || '').toLowerCase() === 'cancelled') return false;

          var compareDate = new Date(program.end || program.start);
          if (isNaN(compareDate.getTime())) return false;

          return compareDate.getTime() >= now - 3600000;
        }).sort(function (left, right) {
          return new Date(left.start).getTime() - new Date(right.start).getTime();
        }).slice(0, 6);

        list.innerHTML = '';

        if (!programs.length) {
          status.textContent = 'No programs are listed yet. Add a test event in data/programs.json or let the Google Calendar sync populate this section.';
          refreshProgramsParticles();
          return;
        }

        status.textContent = '';

        programs.forEach(function (program) {
          list.appendChild(buildProgramCard(program, fallbackCalendarUrl));
        });

        refreshProgramsParticles();

        /* Initialise (or re-initialise) the Swiper for the programs feed */
        setTimeout(function () {
          if (window._programsSwiper) {
            window._programsSwiper.destroy(true, true);
            window._programsSwiper = null;
          }
          window._programsSwiper = new Swiper('.programsSwiper', {
            slidesPerView: 'auto', /* card width fixed in CSS */
            spaceBetween: 20,
            grabCursor: true,
            speed: 400,
            centerInsufficientSlides: true, /* center cards when they don't fill the row */
            /* Allow text selection inside cards — Swiper won't intercept events on these */
            noSwiping: true,
            noSwipingSelector: '.program-card h3, .program-card-date, .program-card-summary, .program-card-meta, .program-card-location, .program-card-note',
            pagination: { el: '.programs-pagination', clickable: true },
          });
        }, 80);
      })
      .catch(function () {
        status.textContent = 'Programs will appear here soon. If you are previewing locally, open the site through a local server or GitHub Pages so the JSON feed can load.';
        refreshProgramsParticles();
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
    spaceBetween: 30,
    grabCursor: true,
    speed: 400,
    centerInsufficientSlides: true, /* center when fewer cards than fill row */
    pagination: { el: '.readings-pagination', clickable: true },
  });
});
