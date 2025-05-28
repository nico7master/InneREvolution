/*
	Helios by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function ($) {
  var $window = $(window),
    $body = $("body"),
    settings = {
      // Carousels
      carousels: {
        speed: 4,
        fadeIn: true,
        fadeDelay: 250,
      },
    };

  // Breakpoints.
  breakpoints({
    wide: ["1281px", "1680px"],
    normal: ["961px", "1280px"],
    narrow: ["841px", "960px"],
    narrower: ["737px", "840px"],
    mobile: [null, "736px"],
  });

  // Play initial animations on page load.
  $window.on("load", function () {
    window.setTimeout(function () {
      $body.removeClass("is-preload");
    }, 100);
  });

  // Dropdowns.
  $("#nav > ul").dropotron({
    mode: "fade",
    speed: 350,
    noOpenerFade: true,
    alignment: "center",
  });

  // Scrolly.
  $(".scrolly").scrolly();

  // Nav.

  // Button.
  $(
    '<div id="navButton">' +
      '<a href="#navPanel" class="toggle"></a>' +
      "</div>"
  ).appendTo($body);

  // Panel.
  $('<div id="navPanel">' + "<nav>" + $("#nav").navList() + "</nav>" + "</div>")
    .appendTo($body)
    .panel({
      delay: 500,
      hideOnClick: true,
      hideOnSwipe: true,
      resetScroll: true,
      resetForms: true,
      target: $body,
      visibleClass: "navPanel-visible",
    });

  // Carousels.
  $(".carousel").each(function () {
    var $t = $(this),
      $forward = $('<span class="forward"></span>'),
      $backward = $('<span class="backward"></span>'),
      $reel = $t.children(".reel"),
      $items = $reel.children("article");

    var pos = 0,
      leftLimit,
      rightLimit,
      itemWidth,
      reelWidth,
      timerId;

    // Items.
    if (settings.carousels.fadeIn) {
      $items.addClass("loading");

      $t.scrollex({
        mode: "middle",
        top: "-20vh",
        bottom: "-20vh",
        enter: function () {
          var timerId,
            limit = $items.length - Math.ceil($window.width() / itemWidth);

          timerId = window.setInterval(function () {
            var x = $items.filter(".loading"),
              xf = x.first();

            if (x.length <= limit) {
              window.clearInterval(timerId);
              $items.removeClass("loading");
              return;
            }

            xf.removeClass("loading");
          }, settings.carousels.fadeDelay);
        },
      });
    }

    // Main.
    $t._update = function () {
      pos = 0;
      rightLimit = -1 * reelWidth + $window.width();
      leftLimit = 0;
      $t._updatePos();
    };

    $t._updatePos = function () {
      $reel.css("transform", "translate(" + pos + "px, 0)");
    };

    // Forward.
    $forward
      .appendTo($t)
      .hide()
      .mouseenter(function (e) {
        timerId = window.setInterval(function () {
          pos -= settings.carousels.speed;

          if (pos <= rightLimit) {
            window.clearInterval(timerId);
            pos = rightLimit;
          }

          $t._updatePos();
        }, 10);
      })
      .mouseleave(function (e) {
        window.clearInterval(timerId);
      });

    // Backward.
    $backward
      .appendTo($t)
      .hide()
      .mouseenter(function (e) {
        timerId = window.setInterval(function () {
          pos += settings.carousels.speed;

          if (pos >= leftLimit) {
            window.clearInterval(timerId);
            pos = leftLimit;
          }

          $t._updatePos();
        }, 10);
      })
      .mouseleave(function (e) {
        window.clearInterval(timerId);
      });

    // Anchor link handling.
    $('a[href^="#"]').on("click", function (e) {
      var target = $(this).attr("href");
      if (
        target.match(
          /^#surya-kriya|#yogasanas|#angamardana|#upa-yoga|#bhuta-shuddhi$/
        )
      ) {
        e.preventDefault();

        var $targetArticle = $(target);
        if ($targetArticle.length) {
          // Scroll page to carousel.
          $("html, body").animate(
            {
              scrollTop: $t.offset().top,
            },
            500
          );

          // Center article in reel.
          itemWidth = $items.first().outerWidth(true);
          var articleIndex = $items.index($targetArticle);
          var newPos =
            -articleIndex * itemWidth + ($window.width() - itemWidth) / 2;

          // Clamp position within limits.
          newPos = Math.min(leftLimit, Math.max(rightLimit, newPos));
          pos = newPos;
          $t._updatePos();

          // Highlight article for 1 second.
          $targetArticle.addClass("highlight");
          setTimeout(function () {
            $targetArticle.removeClass("highlight");
          }, 3500);
        }
      }
    });

    // Init.
    $window.on("load", function () {
      reelWidth = $reel[0].scrollWidth;

      if (browser.mobile) {
        $reel
          .css("overflow-y", "hidden")
          .css("overflow-x", "scroll")
          .scrollLeft(0);
        $forward.hide();
        $backward.hide();
      } else {
        $reel.css("overflow", "visible").scrollLeft(0);
        $forward.show();
        $backward.show();
      }

      $t._update();

      $window
        .on("resize", function () {
          reelWidth = $reel[0].scrollWidth;
          $t._update();
        })
        .trigger("resize");
    });
  });

  // Bio image fixed visibility on scroll
  $(window).on("scroll load resize", function () {
    var $bio = $("#Bio");
    var $img = $(".bio-image .side-image");
    if ($bio.length === 0 || $img.length === 0) return;
    var rect = $bio[0].getBoundingClientRect();
    var imgHeight = $img.outerHeight() || 0;
    var imgTop = window.innerHeight / 2 - imgHeight / 2; // Where the image top would be
    var imgBottom = window.innerHeight / 2 + imgHeight / 2; // Where the image bottom would be

    // Only show if the image would be fully within the bio section
    if (rect.top < imgTop && rect.bottom > imgBottom) {
      $img.addClass("visible-in-bio");
    } else {
      $img.removeClass("visible-in-bio");
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const email = "innerevolutionyoga.life@gmail.com";
    const copyAgainBtn = document.getElementById("copyAgainBtn");
    const emailBox = document.getElementById("emailCopyBox");
    const showEmailBoxBtn = document.getElementById("showEmailBoxBtn");
    let emailBoxTimeout;

    function copyEmail() {
      navigator.clipboard.writeText(email).then(() => {
        copyAgainBtn.textContent = "Copied";
        copyAgainBtn.classList.add("copied");
        clearTimeout(emailBoxTimeout);

        // After 1 seconds, revert button text
        emailBoxTimeout = setTimeout(() => {
          copyAgainBtn.textContent = "Copy";
          copyAgainBtn.classList.remove("copied");
        }, 1000);

        // After 4 seconds, hide the box
        setTimeout(() => {
          emailBox.classList.remove("visible");
        }, 4000);
      });
    }

    if (showEmailBoxBtn && emailBox) {
      showEmailBoxBtn.addEventListener("click", function () {
        emailBox.classList.add("visible");
        copyEmail();
      });
    }

    if (copyAgainBtn && emailBox) {
      copyAgainBtn.addEventListener("click", function () {
        copyEmail();
      });
    }
  });
})(jQuery);
