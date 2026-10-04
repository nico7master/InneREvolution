/**
 * Newsletter signup — email capture for program announcements.
 *
 * Talks to the Apps Script newsletter endpoint (action: 'newsletter').
 * Strategy mirrors booking.js: Apps Script 302-redirects cross-origin POSTs,
 * so a readable fetch usually fails CORS. We try the readable request first;
 * if the browser blocks it, we fall back to an opaque no-cors POST and show
 * the generic success message (the backend always writes the row).
 *
 * Depends on CONFIG from booking/config.js (loaded before this file).
 */
(function () {
  'use strict';

  // Localised strings — resolved from the page language
  var STRINGS = {
    en: {
      invalidEmail: 'Please enter a valid email address (e.g. name@example.com).',
      noConfig: 'Notifications are not configured yet. Please check back later.',
      submitting: 'Subscribing…',
      timeout: 'The request is taking longer than expected — please check your connection and try again.',
      network: 'We couldn\u2019t reach the server. Please check your internet connection and try again.',
      success: '✓ Done! We will notify you about new programs.',
      already: '✓ You\u2019re already on the list — we will notify you about new programs.',
      error: 'Something went wrong. Please try again in a moment.'
    },
    de: {
      invalidEmail: 'Bitte gib eine g\u00fcltige E-Mail-Adresse ein (z.\u2009B. name@beispiel.de).',
      noConfig: 'Benachrichtigungen sind noch nicht konfiguriert. Bitte schau sp\u00e4ter wieder vorbei.',
      submitting: 'Wird angemeldet\u2026',
      timeout: 'Die Anfrage dauert l\u00e4nger als erwartet \u2014 bitte pr\u00fcfe deine Verbindung und versuche es erneut.',
      network: 'Der Server ist nicht erreichbar. Bitte pr\u00fcfe deine Internetverbindung und versuche es erneut.',
      success: '✓ Fertig! Wir benachrichtigen dich über neue Programme.',
      already: '✓ Du bist bereits auf der Liste — wir benachrichtigen dich über neue Programme.',
      error: 'Etwas ist schiefgelaufen. Bitte versuche es gleich noch einmal.'
    }
  };

  function ns(key) {
    var lang = detectLang();
    return STRINGS[lang][key];
  }

  // Same priority as i18n.js: URL path wins (static page content language),
  // then documentElement.lang. localStorage is deliberately ignored because
  // it can override the URL on this static site.
  function detectLang() {
    var path = window.location.pathname;
    if (path.indexOf('/de/') === 0 || path.lastIndexOf('/de', path.length - 3) === path.length - 3) {
      return 'de';
    }
    return (document.documentElement.lang === 'de') ? 'de' : 'en';
  }

  function isValidEmailFormat(value) {
    // Same regex spirit as the backend: local@domain.tld, no spaces
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
  }

  function setMessage(text, kind) {
    var el = document.getElementById('newsletter-message');
    if (!el) return;
    el.textContent = text;
    el.className = 'newsletter-message' + (kind ? ' ' + kind : '');
    // Explicit 'block' — the stylesheet base rule is display:none, so '' would hide it
    el.style.display = text ? 'block' : 'none';
  }

  function setBusy(busy) {
    var btn = document.getElementById('newsletter-submit');
    var input = document.getElementById('newsletter-email');
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    var label = btn.querySelector('.newsletter-btn-label');
    var spinner = btn.querySelector('.newsletter-btn-spinner');
    // Hide label but keep its space (no layout jump); show centered spinner
    if (label) label.style.visibility = busy ? 'hidden' : '';
    if (spinner) spinner.hidden = !busy;
    if (input) input.disabled = busy;
  }

  // Readable fetch attempt — works when the browser can follow the redirect
  // with CORS headers (depends on Apps Script deployment behaviour).
  function tryReadable(url, payload) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 12000);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // Opaque fallback — fire-and-forget POST like booking.js uses.
  function tryOpaque(url, payload) {
    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      body: JSON.stringify(payload)
    }).then(function () {
      // Opaque response — we cannot read the server reply.
      return { success: true, opaque: true };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    var form = document.getElementById('newsletter-form');
    var input = document.getElementById('newsletter-email');
    if (!form || !input) return;

    // Endpoint: config.js may override, built-in default keeps signup working
    // even when the deploy workflow regenerates config.js without this key.
    // The URL is not a secret — it is publicly visible to every visitor.
    var DEFAULT_NEWSLETTER_URL = 'https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec';
    var url = (typeof CONFIG !== 'undefined' && CONFIG.NEWSLETTER_URL) || DEFAULT_NEWSLETTER_URL;
    if (!url) {
      setMessage(ns('noConfig'), 'is-error');
      return;
    }

    var email = input.value.trim();
    if (!isValidEmailFormat(email)) {
      setMessage(ns('invalidEmail'), 'is-error');
      input.focus();
      return;
    }

    setBusy(true);
    setMessage(ns('submitting'), 'is-busy');

    var payload = {
      action: 'newsletter',
      email: email,
      lang: detectLang(),
      source: 'homepage-carousel',
      submittedAt: new Date().toISOString()
    };

    tryReadable(url, payload)
      .catch(function () {
        // Browser blocked the readable request (CORS) — retry opaquely
        return tryOpaque(url, payload);
      })
      .then(function (result) {
        setBusy(false);
        if (result && result.success) {
          form.style.display = 'none';
          setMessage(result.alreadySubscribed ? ns('already') : ns('success'), 'is-success');
        } else {
          setMessage(ns('error'), 'is-error');
        }
      })
      .catch(function (err) {
        setBusy(false);
        var msg = (err && err.name === 'AbortError') ? ns('timeout') : ns('network');
        setMessage(msg, 'is-error');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('newsletter-form');
    if (form) form.addEventListener('submit', handleSubmit);
  });
})();
