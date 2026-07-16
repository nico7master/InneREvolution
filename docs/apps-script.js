/**
 * InneREvolution — Google Apps Script (Full Suite v5 / deploy v75)
 * ─────────────────────────────────────────────────────
 * Version: v5 (2026-04-22)   —   Robustness overhaul
 *
 * NEW IN v75 (vs v74 / code version v4):
 *   R1. Stripe webhook signature NOT verifiable via Apps Script headers.
 *       Instead: every incoming webhook event is re-fetched via Stripe API
 *       (/v1/events/{id}) to confirm authenticity before marking paid.
 *   R2. Webhook matches booking by `client_reference_id` (= Booking ID),
 *       not by email. Fixes cross-contamination when one email has
 *       multiple bookings.
 *   R3. Payment URL returned to client now includes
 *       `&client_reference_id=BK-...` so the Stripe Checkout carries the
 *       booking ID back into the webhook event.
 *   R4. Central `COLS` constant — single source of truth for column
 *       indices. No more scattered magic numbers.
 *   R5. API token required on doPost booking requests (`data.apiToken`)
 *       to block anonymous bots. Webhook path is exempt (verified via R1).
 *   R6. Global rate-limit via CacheService (30 bookings / minute max).
 *   R7. `createStripePaymentLink` caches product IDs by program name in
 *       Script Properties → no duplicate Stripe products on re-edit.
 *   R8. Cancellation flow: signed `doGet(?action=cancel&id=BK-..&t=..)`
 *       marks booking cancelled, frees the spot, notifies instructor.
 *   R9. `logError()` helper writes to `📛 Error Log` sheet (created on
 *       demand) + emails instructor on critical errors.
 *   R10. Friend referral matching now tries email first, then name.
 *
 * PRESERVED FROM v74:
 *   - All email HTML templates (client confirmation, instructor,
 *     intake, payment reminder, daily report)
 *   - LockService concurrency protection on bookings
 *   - Duplicate booking prevention (email + programId)
 *   - Tab-name fallbacks (emoji ↔ English)
 *   - safeAlert() trigger-safe UI helper
 *
 * COLUMN MAPPINGS (see COLS constant below for single source of truth):
 *   🧘 Kursplanung (data starts row 4, 3 header rows)
 *   📋 Buchungen   (data starts row 2, 1 header row)
 *   🏷 Rabatte     (data starts row 3, title + header)
 *   📅 Sessions    (data starts row 2, 1 header row)
 *
 * Script Properties required:
 *   SHEET_ID, CALENDAR_ID, INSTRUCTOR_EMAIL,
 *   STRIPE_KEY_TEST, STRIPE_KEY_LIVE, STRIPE_WEBHOOK_SECRET_TEST,
 *   STRIPE_WEBHOOK_SECRET_LIVE, TEST_MODE, INTAKE_FORM_URL,
 *   API_TOKEN (shared secret with the website),
 *   CANCELLATION_SECRET (HMAC key for cancel URLs)
 */

// ─── MANUAL MODE — Set to true to disable ALL automations (emails, Stripe, triggers) ──
// When true: onEdit, doPost, doGet, all triggers are short-circuited.
// Set to false to re-enable full automation.
var MANUAL_MODE = true;

// ─── 0. COLUMN MAPS — SINGLE SOURCE OF TRUTH (R4) ────────────────────────────
var COLS = {
  KURSPLANUNG: {
    FIRST_DATA_ROW: 4,  // row 1 title, row 2 colors, row 3 headers
    ISHA_CODE: 0,    // A
    INSTANCE_ID: 1,  // B
    MODUL_TYP: 2,    // C
    KURSNAME: 3,     // D
    MODUL: 4,        // E
    SESSIONS: 5,     // F
    STD_SESS: 6,     // G
    DATUM: 7,        // H
    UHRZEIT: 8,      // I
    ORT: 9,          // J
    MAX_TN: 10,      // K
    EMPF_PREIS: 11,  // L
    PREIS_TN: 12,    // M
    ANGEMELDET: 13,  // N (AUTO)
    WEBSITE: 14,     // O
    UMSATZ: 15,      // P (AUTO)
    AUSLASTUNG: 16,  // Q (AUTO)
    SPRACHE: 17,     // R
    TOTAL_STD: 18,   // S
    HELPER: 19,      // T
    STRIPE_TEST: 20, // U
    STRIPE_LINK: 21, // V
    FREIE_PLATZE: 22,// W (AUTO K-N)
    BESCHREIBUNG: 23 // X
  },
  BUCHUNGEN: {
    FIRST_DATA_ROW: 2,
    DATUM: 0,        // A
    NAME: 1,         // B
    EMAIL: 2,        // C
    TELEFON: 3,      // D
    INSTANCE_ID: 4,  // E
    KURSNAME: 5,     // F
    RABATTCODE: 6,   // G
    RABATT_PCT: 7,   // H
    FREUNDE_PCT: 8,  // I
    TOTAL_RABATT: 9, // J
    FINAL_EUR: 10,   // K
    PAYMENT_SENT: 11,// L
    BEZAHLT: 12,     // M
    INTAKE_SENT: 13, // N
    FREUNDE_ANZ: 14, // O
    FREUNDE_NAMEN: 15, // P
    FREUNDE_VERIFIED: 16, // Q
    REFERRED_BY: 17, // R
    REFERRER_OK: 18, // S
    BOOKING_ID: 19,  // T
    STATUS: 20       // U  (NEW in v75: active / cancelled)
  },
  RABATTE: {
    FIRST_DATA_ROW: 3,
    CODE: 0, PCT: 1, DESC: 2, VALID_UNTIL: 3, ACTIVE: 4, USES: 5
  },
  SESSIONS: {
    FIRST_DATA_ROW: 2,
    INSTANCE_ID: 0, KURSNAME: 1, SESSION_NUM: 2, DATUM: 3,
    START: 4, END: 5, ORT: 6, TN: 7, STATUS: 8, NOTIZEN: 9, CAL_EVENT_ID: 10
  }
};

// ─── 0a. CONFIG ───────────────────────────────────────────────────────────────
function getConfig() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var testMode = (p.TEST_MODE || 'true').toString().toLowerCase() === 'true';
  var webhookSecret = testMode
    ? (p.STRIPE_WEBHOOK_SECRET_TEST || p.STRIPE_WEBHOOK_SECRET || '')
    : (p.STRIPE_WEBHOOK_SECRET_LIVE || p.STRIPE_WEBHOOK_SECRET || '');
  return {
    SHEET_ID:              p.SHEET_ID              || SpreadsheetApp.getActiveSpreadsheet().getId(),
    CALENDAR_ID:           p.CALENDAR_ID           || '',
    STRIPE_KEY:            testMode ? (p.STRIPE_KEY_TEST || p.STRIPE_KEY || '') : (p.STRIPE_KEY_LIVE || p.STRIPE_KEY || ''),
    INSTRUCTOR_EMAIL:      p.INSTRUCTOR_EMAIL      || Session.getActiveUser().getEmail(),
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    INTAKE_FORM_URL:       p.INTAKE_FORM_URL       || 'https://innerevolutionyoga.life/intake',
    API_TOKEN:             p.API_TOKEN             || '',  // R5
    CANCELLATION_SECRET:   p.CANCELLATION_SECRET   || '',  // R8
    WEB_APP_URL:           p.WEB_APP_URL           || '',  // used in cancel link
    TEST_MODE:             testMode
  };
}

// ─── SAFE ALERT (trigger-safe UI helper) ──────────────────────────────────────
function safeAlert(title, message, buttons) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(title, message, buttons || ui.ButtonSet.OK);
  } catch (e) {
    Logger.log('[ALERT] ' + title + ': ' + message);
  }
}

// ─── EMAIL VALIDATION ─────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// ─── HMAC-SHA256 HELPER (R8 — cancellation token signing) ─────────────────────
function hmacSign(message, secret) {
  var raw = Utilities.computeHmacSha256Signature(String(message), String(secret));
  return raw.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}
function constantTimeEquals(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ─── RATE LIMIT (R6) — global N-per-minute using CacheService ────────────────
function checkRateLimit(bucket, maxPerMinute) {
  try {
    var cache = CacheService.getScriptCache();
    var now = Math.floor(Date.now() / 1000);
    var windowStart = now - (now % 60);
    var key = 'RL:' + bucket + ':' + windowStart;
    var cur = parseInt(cache.get(key) || '0');
    if (cur >= maxPerMinute) return false;
    cache.put(key, String(cur + 1), 70);
    return true;
  } catch (e) {
    Logger.log('[RATELIMIT] cache error: ' + e.message);
    return true; // fail open
  }
}

// ─── ERROR LOG (R9) — persistent log sheet + optional email alert ────────────
function logError(context, err, extra) {
  try {
    var cfg = getConfig();
    var ss  = SpreadsheetApp.openById(cfg.SHEET_ID);
    var sh  = ss.getSheetByName('📛 Error Log');
    if (!sh) {
      sh = ss.insertSheet('📛 Error Log');
      sh.appendRow(['Timestamp', 'Context', 'Error', 'Stack', 'Data']);
      sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#5F1630').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    var dataStr = '';
    try { dataStr = extra ? JSON.stringify(extra).substring(0, 2000) : ''; } catch (e) { dataStr = String(extra); }
    sh.appendRow([
      new Date(),
      String(context || ''),
      String((err && err.message) || err || ''),
      String((err && err.stack) || '').substring(0, 2000),
      dataStr
    ]);
  } catch (e) {
    Logger.log('[LOG_ERROR FAILED] ' + e.message);
  }
  Logger.log('[ERROR] ' + context + ': ' + ((err && err.message) || err));
}


// ─── 1. MENU ──────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('InneREvolution')
    .addItem('Format All Tabs',             'formatSheet')
    .addItem('Rebuild Dashboard',           'buildDashboard')
    .addSeparator()
    .addItem('Sync Sessions to Calendar',   'syncSessionsToCalendar')
    .addSeparator()
    .addItem('Check Friend Referrals',      'checkFriendReferrals')
    .addItem('Send Payment Reminders',      'sendPaymentReminders')
    .addItem('Send Daily Report',           'sendDailyReport')
    .addSeparator()
    .addItem('Create Missing Stripe Links', 'createAllStripeLinks')
    .addItem('Recolor All Rows by Program ID', 'recolorAllRows')
    .addSeparator()
    .addItem('Setup Automation Triggers',   'setupTriggers')
    .addItem('Authorize & Test',            'authorizeAndTest')
    .addToUi();
}

// ─── 2. WEB APP ───────────────────────────────────────────────────────────────
function doGet(e) {
  if (MANUAL_MODE) { return ContentService.createTextOutput('InneREvolution — MANUAL MODE (automations disabled)'); }
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    if (params.action === 'cancel' && params.id && params.t) {
      return handleCancellation(params.id, params.t);
    }
    if (params.action === 'health') {
      return jsonResponse({ ok: true, version: 'v75', ts: new Date().toISOString() });
    }
  } catch (err) {
    logError('doGet', err, e && e.parameter);
  }
  return ContentService.createTextOutput('InneREvolution Booking API v75 — OK');
}

// ─── CANCELLATION (R8) — signed link handler ─────────────────────────────────
function handleCancellation(bookingId, token) {
  var cfg = getConfig();
  if (!cfg.CANCELLATION_SECRET) {
    return htmlPage('Cancellation is not configured. Please contact us.', '#5F1630');
  }
  var expected = hmacSign(bookingId, cfg.CANCELLATION_SECRET);
  if (!constantTimeEquals(token, expected)) {
    return htmlPage('Invalid or expired cancellation link.', '#5F1630');
  }
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) return htmlPage('Server busy, please retry in a moment.', '#5F1630');
    var ss = SpreadsheetApp.openById(cfg.SHEET_ID);
    var book = ss.getSheetByName('📋 Buchungen') || ss.getSheetByName('Bookings');
    if (!book) return htmlPage('Booking sheet not found.', '#5F1630');
    var rows = book.getDataRange().getValues();
    var B = COLS.BUCHUNGEN;
    for (var r = 1; r < rows.length; r++) {
      if (String(rows[r][B.BOOKING_ID]).trim() === String(bookingId).trim()) {
        var currentStatus = String(rows[r][B.STATUS] || '').toLowerCase();
        if (currentStatus === 'cancelled') {
          return htmlPage('This booking is already cancelled.', '#826400');
        }
        // Write STATUS column (U = col 21, 1-based)
        book.getRange(r + 1, B.STATUS + 1).setValue('cancelled');
        try {
          var name = rows[r][B.NAME] || 'Customer';
          var email = rows[r][B.EMAIL];
          var progName = rows[r][B.KURSNAME] || '';
          if (cfg.INSTRUCTOR_EMAIL) {
            GmailApp.sendEmail(cfg.INSTRUCTOR_EMAIL,
              '[Cancellation] ' + name + ' — ' + progName,
              'Booking ' + bookingId + ' (' + name + ' / ' + email + ') cancelled via self-service link at ' + new Date().toISOString(),
              {});
          }
        } catch (em) { logError('handleCancellation:email', em, {id: bookingId}); }
        return htmlPage('Your booking for <strong>' + (rows[r][B.KURSNAME] || '') + '</strong> has been cancelled.<br><br>If you change your mind, please contact us directly.', '#0A5A41');
      }
    }
    return htmlPage('Booking not found.', '#5F1630');
  } catch (err) {
    logError('handleCancellation', err, {id: bookingId});
    return htmlPage('An error occurred. Please contact us.', '#5F1630');
  } finally {
    try { lock.releaseLock(); } catch(e2) {}
  }
}
function htmlPage(message, color) {
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>InneREvolution</title>'
    + '<style>body{font-family:Helvetica,Arial,sans-serif;background:#f8f5ff;margin:0;padding:40px;color:#333}'
    + '.box{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}'
    + '.hdr{background:' + (color || '#371964') + ';color:#fff;padding:20px;margin:-40px -40px 24px;border-radius:12px 12px 0 0;font-weight:bold}'
    + '</style></head><body><div class="box"><div class="hdr">InneREvolution Yoga</div>'
    + '<p style="font-size:16px;line-height:1.6">' + message + '</p>'
    + '<p style="font-size:13px;color:#999;margin-top:32px">innerevolutionyoga.life</p>'
    + '</div></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function doPost(e) {
  if (MANUAL_MODE) { Logger.log('[MANUAL_MODE] doPost blocked'); return jsonResponse({ success: false, error: 'Booking system is in manual mode. Please contact us directly.' }); }
  Logger.log('[REQUEST] doPost received');
  try {
    var data = JSON.parse(e.postData.contents);
    Logger.log('[REQUEST] Parsed data keys: ' + Object.keys(data).join(','));

    // Route: Stripe webhook events (authenticity re-verified inside)
    if (data.type && (data.type.indexOf('payment_intent') === 0 ||
                      data.type === 'checkout.session.completed' ||
                      data.type.indexOf('charge.') === 0)) {
      Logger.log('[REQUEST] Routing to Stripe webhook handler');
      return handleStripeWebhook(data);
    }

    // Bookings — protected path
    // R6: rate limit — 30 bookings/min globally is plenty for a yoga business
    if (!checkRateLimit('booking', 30)) {
      Logger.log('[RATELIMIT] rejected booking');
      return jsonResponse({ success: false, error: 'Too many requests. Please try again in a minute.' });
    }
    // R5: API token shared secret
    var cfg = getConfig();
    if (cfg.API_TOKEN) {
      if (!data.apiToken || !constantTimeEquals(String(data.apiToken), String(cfg.API_TOKEN))) {
        Logger.log('[AUTH] booking rejected: bad/missing apiToken');
        return jsonResponse({ success: false, error: 'Unauthorized.' });
      }
    }

    Logger.log('[REQUEST] Routing to booking handler');
    return handleBooking(data);
  } catch (err) {
    Logger.log('[ERROR] doPost: ' + err.message + '\nStack: ' + err.stack);
    logError('doPost', err, e ? e.postData : null);
    try { sendErrorAlert('doPost', err, e ? e.postData : null); } catch(e2) {}
    return jsonResponse({ success: false, error: err.message });
  }
}

function handleBooking(data) {
  Logger.log('[BOOKING] === START === programId=' + data.programId + ' name=' + data.fullName + ' email=' + data.email);

  if (data.email && !isValidEmail(data.email)) {
    Logger.log('[BOOKING] FAIL: invalid email: ' + data.email);
    return jsonResponse({ success: false, error: 'Invalid email address format.' });
  }

  var cfg = getConfig();
  var K   = COLS.KURSPLANUNG;
  var B   = COLS.BUCHUNGEN;
  var D   = COLS.RABATTE;
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var disc = ss.getSheetByName('🏷 Rabatte')      || ss.getSheetByName('Discount Codes');
  var book = ss.getSheetByName('📋 Buchungen')     || ss.getSheetByName('Bookings');

  if (!prog) return jsonResponse({ success: false, error: 'Sheet tab not found: Kursplanung' });
  if (!book) return jsonResponse({ success: false, error: 'Sheet tab not found: Buchungen' });

  var required = ['programId', 'fullName', 'email', 'phone'];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]]) {
      return jsonResponse({ success: false, error: 'Missing: ' + required[i] });
    }
  }

  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      return jsonResponse({ success: false, error: 'Server busy, please try again.' });
    }

    var progData = prog.getDataRange().getValues();

    var progRow = null, progRowIndex = -1;
    for (var r = K.FIRST_DATA_ROW - 1; r < progData.length; r++) {
      var cellVal = String(progData[r][K.INSTANCE_ID]).trim();
      if (cellVal === String(data.programId).trim()) { progRow = progData[r]; progRowIndex = r; break; }
    }
    if (!progRow) {
      Logger.log('[BOOKING] FAIL: program not found: ' + data.programId);
      return jsonResponse({ success: false, error: 'Program not found: ' + data.programId });
    }

    // Duplicate booking check (exclude cancelled) + preload email index for M1
    var bookData = book.getDataRange().getValues();
    var emailKey = String(data.email).toLowerCase().trim();
    var pidKey   = String(data.programId).trim();
    for (var b = 1; b < bookData.length; b++) {
      var status = String(bookData[b][B.STATUS] || '').toLowerCase();
      if (status === 'cancelled') continue;
      if (String(bookData[b][B.EMAIL]).toLowerCase().trim() === emailKey &&
          String(bookData[b][B.INSTANCE_ID]).trim() === pidKey) {
        return jsonResponse({ success: false, error: 'You are already registered for this program.' });
      }
    }

    var basePrice   = parseFloat(String(progRow[K.PREIS_TN]).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    var spotsLeft   = parseInt(progRow[K.FREIE_PLATZE]);
    var programName = progRow[K.KURSNAME];
    var stripeLink  = progRow[K.STRIPE_LINK] || '';
    Logger.log('[BOOKING] Data: price=' + basePrice + ' spots=' + spotsLeft + ' name="' + programName + '" stripe=' + (stripeLink ? 'YES' : 'NONE'));

    if (!isNaN(spotsLeft) && spotsLeft <= 0) {
      return jsonResponse({ success: false, error: 'This program is fully booked.' });
    }

    // Discount code
    var codeDiscount = 0, usedCode = '';
    if (data.discountCode && disc) {
      var discData = disc.getDataRange().getValues();
      for (var d = D.FIRST_DATA_ROW - 1; d < discData.length; d++) {
        if (String(discData[d][D.CODE]).toUpperCase() === String(data.discountCode).toUpperCase()) {
          var isActive = String(discData[d][D.ACTIVE]).toUpperCase();
          if (isActive === 'NO' || isActive === 'NEIN') break;
          var expiryDate = discData[d][D.VALID_UNTIL];
          if (expiryDate instanceof Date && expiryDate < new Date()) break;
          codeDiscount = parseFloat(discData[d][D.PCT]) || 0;
          usedCode = discData[d][D.CODE];
          var currentUses = parseInt(discData[d][D.USES]) || 0;
          disc.getRange(d + 1, D.USES + 1).setValue(currentUses + 1);
          break;
        }
      }
    }

    var friendsPct = parseFloat(data.friendsDiscountPct) || 0;
    var totalDisc  = Math.min(codeDiscount + friendsPct, 50);
    var finalPrice = Math.round(basePrice * (1 - totalDisc / 100) * 100) / 100;

    var bookingId = 'BK-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    book.appendRow([
      new Date(),              // A: Datum
      data.fullName,           // B: Name
      data.email,              // C: Email
      data.phone,              // D: Telefon
      data.programId,          // E: Instance ID
      programName,             // F: Kursname
      usedCode,                // G: Rabattcode
      codeDiscount,            // H: % Rabatt
      friendsPct,              // I: Freunde %
      totalDisc,               // J: Total Rabatt %
      finalPrice,              // K: Final EUR
      'YES',                   // L: Payment Sent
      'NO',                    // M: Bezahlt
      'NO',                    // N: Intake gesendet
      data.friendsCount || 0,  // O: Freunde Anz.
      data.friendNames  || '', // P: Freunde Namen
      'NO',                    // Q: Freunde verifiziert
      data.referredBy   || '', // R: Empfehlung von
      'NO',                    // S: Empfehler bestätigt
      bookingId,               // T: Booking ID
      'active'                 // U: Status (R8 — new column)
    ]);
    Logger.log('[BOOKING] Row written (ID: ' + bookingId + ')');

    // R3: append client_reference_id (=bookingId) + prefilled_email to pay URL
    // so Stripe Checkout echoes bookingId back in webhook event.
    var payUrl = stripeLink;
    if (payUrl) {
      var sep = payUrl.indexOf('?') >= 0 ? '&' : '?';
      payUrl += sep + 'client_reference_id=' + encodeURIComponent(bookingId);
      if (data.email) payUrl += '&prefilled_email=' + encodeURIComponent(data.email);
    }

    // Build formatted session list from Sessions tab for the confirmation email
    var sessionsStr = '';
    var S = COLS.SESSIONS;
    var sessSheet   = ss.getSheetByName('📅 Sessions') || ss.getSheetByName('Sessions');
    if (sessSheet) {
      var DAYS_DE   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
      var MONTHS_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
      var fmtTime = function(t) {
        if (t instanceof Date) return ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2);
        if (typeof t === 'number') {
          var h = Math.floor(t * 24);
          var m = Math.round((t * 24 - h) * 60);
          return ('0'+h).slice(-2)+':'+('0'+m).slice(-2);
        }
        if (typeof t === 'string' && /\d/.test(t)) return t.trim().substring(0,5);
        return '';
      };
      var sessData = sessSheet.getDataRange().getValues();
      var sesLines = [];
      for (var si = 1; si < sessData.length; si++) {
        var sRow = sessData[si];
        if (String(sRow[S.INSTANCE_ID]).trim() !== String(data.programId).trim()) continue;
        var sd = sRow[S.DATUM] instanceof Date ? sRow[S.DATUM] : new Date(sRow[S.DATUM]);
        if (isNaN(sd.getTime())) continue;
        var ts  = sRow[S.START] ? fmtTime(sRow[S.START]) : '';
        var te  = sRow[S.END] ? fmtTime(sRow[S.END]) : '';
        var timeStr = (ts && te) ? '<div style="color:#888;font-size:13px;margin-top:2px">' + ts + '\u2013' + te + '</div>' : '';
        sesLines.push('<div style="margin-bottom:6px"><strong>' + DAYS_DE[sd.getDay()] + ', ' + sd.getDate() + '. ' + MONTHS_DE[sd.getMonth()] + '</strong>' + timeStr + '</div>');
      }
      sessionsStr = sesLines.join('');
    }

    try { sendClientConfirmation(data, programName, finalPrice, totalDisc, payUrl, sessionsStr, progRow[K.ORT]); Logger.log('[BOOKING] Client email sent'); }
    catch (err) { logError('sendClientConfirmation', err, data); try { sendErrorAlert('sendClientConfirmation', err, data); } catch(e2) {} }
    try { sendInstructorNotification(data, programName, finalPrice, cfg.INSTRUCTOR_EMAIL); Logger.log('[BOOKING] Instructor email sent'); }
    catch (err) { logError('sendInstructorNotification', err, data); try { sendErrorAlert('sendInstructorNotification', err, data); } catch(e2) {} }

    Logger.log('[BOOKING] === SUCCESS === ' + data.fullName + ' / ' + programName + ' EUR ' + finalPrice);
    return jsonResponse({ success: true, bookingId: bookingId, paymentUrl: payUrl, programName: programName, finalPrice: finalPrice });
  } finally {
    try { lock.releaseLock(); } catch(e2) {}
  }
}



// ─── ERROR ALERTS ─────────────────────────────────────────────────────────────
function sendErrorAlert(context, err, data) {
  try {
    var cfg           = getConfig();
    var instructorEmail = cfg.INSTRUCTOR_EMAIL || 'info@innerevolutionyoga.life';
    var timestamp     = new Date().toLocaleString('de-AT', { timeZone: 'Europe/Vienna' });
    var dataStr       = '';
    if (data) {
      try { dataStr = JSON.stringify(data, null, 2); } catch(e) { dataStr = String(data); }
    }
    var html =
      '<div style="font-family:Arial,sans-serif;max-width:600px;background:#fff;border-radius:8px;overflow:hidden">'
      + '<div style="background:#c0392b;padding:20px 24px">'
      + '<h2 style="color:#fff;margin:0;font-size:18px">⚠️ Apps Script Error</h2>'
      + '<p style="color:#f5a8a8;margin:6px 0 0;font-size:13px">InneREvolution Booking System — ' + timestamp + '</p>'
      + '</div>'
      + '<div style="padding:24px;background:#fafafa">'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<tr><td style="padding:6px 12px;background:#f0f0f0;color:#666;width:120px">Kontext</td><td style="padding:6px 12px"><strong>' + context + '</strong></td></tr>'
      + '<tr><td style="padding:6px 12px;background:#f0f0f0;color:#666">Fehler</td><td style="padding:6px 12px;color:#c0392b"><strong>' + err.message + '</strong></td></tr>'
      + (err.stack ? '<tr><td style="padding:6px 12px;background:#f0f0f0;color:#666;vertical-align:top">Stack</td><td style="padding:6px 12px;font-size:11px;color:#888;white-space:pre-wrap">' + err.stack + '</td></tr>' : '')
      + (dataStr ? '<tr><td style="padding:6px 12px;background:#f0f0f0;color:#666;vertical-align:top">Daten</td><td style="padding:6px 12px;font-size:11px;color:#555;white-space:pre-wrap">' + dataStr + '</td></tr>' : '')
      + '</table>'
      + '<p style="margin:16px 0 0;font-size:12px;color:#999">Automatisch generiert vom InneREvolution Booking System</p>'
      + '</div>'
      + '</div>';
    GmailApp.sendEmail(instructorEmail,
      '[⚠️ BOOKING ERROR] ' + context + ' — ' + err.message.substring(0, 80),
      'Error in ' + context + ': ' + err.message + '\n\nData: ' + dataStr,
      { htmlBody: html });
    Logger.log('[ERROR ALERT] Sent to ' + instructorEmail);
  } catch(alertErr) {
    Logger.log('[ERROR ALERT FAILED] ' + alertErr.message);
  }
}

// ─── 3. EMAILS ────────────────────────────────────────────────────────────────
function sendClientConfirmation(data, programName, finalPrice, discountPct, payUrl, sessionsStr, ort) {
  // Build booking info rows — use real UTF-8 emoji (GS V8 handles them; HTML entities don't render in email subjects)
  var infoRows = '';
  if (programName) infoRows += '<tr><td style="padding:8px 0;color:#777;white-space:nowrap;vertical-align:top">&#x1F9D8; Programm</td><td style="padding:8px 0;padding-left:16px;font-weight:600;color:#371964">' + programName + '</td></tr>';
  if (sessionsStr) infoRows += '<tr><td style="padding:8px 0;color:#777;white-space:nowrap;vertical-align:top">&#x1F4C5; Datum</td><td style="padding:8px 0;padding-left:16px;line-height:2">' + sessionsStr + '</td></tr>';
  if (ort)         infoRows += '<tr><td style="padding:8px 0;color:#777;white-space:nowrap;vertical-align:top">&#x1F4CD; Ort</td><td style="padding:8px 0;padding-left:16px">' + ort + '</td></tr>';
  if (discountPct > 0) infoRows += '<tr><td style="padding:8px 0;color:#777;white-space:nowrap">&#x1F3F7;&#xFE0F; Rabatt</td><td style="padding:8px 0;padding-left:16px;color:#0A5A41;font-weight:600">-' + discountPct + '%</td></tr>';
  infoRows += '<tr style="border-top:2px solid #e0d4f7"><td style="padding:12px 0 4px;font-weight:bold;font-size:15px;color:#371964">Gesamtbetrag</td><td style="padding:12px 0 4px;padding-left:16px;font-size:22px;font-weight:bold;color:#371964">EUR ' + finalPrice.toFixed(2) + '</td></tr>';
  var btnHtml = payUrl
    ? '<div style="text-align:center;margin:32px 0"><a href="' + payUrl + '" style="display:inline-block;background:#e8562a;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:17px;letter-spacing:0.5px">&#x1F64F; Jetzt bezahlen</a></div>'
    : '';
  // Gmail-safe signature: solid bg per-td, fluid width — works on desktop + mobile
  var sig =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0d1830;border-radius:10px;overflow:hidden;border:1px solid #2e2a22;margin-top:8px;">'
    + '<tr>'
    + '<td width="80" bgcolor="#0d1830" style="background:#0d1830;padding:16px 0 16px 16px;vertical-align:middle;">'
    + '<img src="https://innerevolutionyoga.life/images/signature/NicoSchlagerProfileYoga.png" width="64" height="64" style="display:block;border-radius:4px;" />'
    + '</td>'
    + '<td bgcolor="#0d1830" style="background:#0d1830;padding:14px 12px;vertical-align:middle;">'
    + '<div style="color:#D6CEBC;font-size:15px;font-weight:bold;letter-spacing:0.5px;margin:0 0 2px;font-family:Georgia,serif;">Nico Schlager</div>'
    + '<div style="color:#a0987e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 5px;font-family:Georgia,serif;">Klassisches Hatha Yoga</div>'
    + '<div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#D6CEBC;margin:0 0 6px;font-family:Georgia,serif;">INNE<span style="font-size:18px;line-height:0;vertical-align:middle;position:relative;top:-1px;color:#fff;">&reg;</span>EVOLUTION</div>'
    + '<a href="https://innerevolutionyoga.life/de" style="color:#9ab4d8;font-size:11px;text-decoration:none;font-weight:bold;display:block;margin:0 0 8px;font-family:Georgia,serif;">innerevolutionyoga.life</a>'
    + '<table cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td style="padding-right:8px;"><a href="https://wa.me/qr/3CTAALSBOSBXH1" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_whatsapp.png" width="20" height="20" style="display:block;" /></a></td>'
    + '<td style="padding-right:8px;"><a href="https://www.instagram.com/innerevolution.yoga" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_instagram.png" width="20" height="20" style="display:block;" /></a></td>'
    + '<td><a href="https://innerevolutionyoga.life/de" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_globe.png" width="20" height="20" style="display:block;" /></a></td>'
    + '</tr></table>'
    + '</td>'
    + '<td width="72" bgcolor="#0d1830" style="background:#0d1830;padding:16px 16px 16px 0;vertical-align:middle;text-align:center;">'
    + '<img src="https://innerevolutionyoga.life/images/signature/Logo%20Mystical%20Simple%20Cut%20Reduced.png" width="48" style="display:block;margin:0 auto;opacity:0.95;" />'
    + '</td>'
    + '</tr>'
    + '</table>';
  var html =
    '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">'
    + '<div style="background:#371964;padding:40px 32px;text-align:center">'
    + '<p style="color:#c8b8ef;margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase">InneREvolution Yoga</p>'
    + '<h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:300;letter-spacing:1px">Anmeldung bestätigt</h1>'
    + '<p style="color:#e0d4f7;margin:12px 0 0;font-size:15px">✨ Dein Platz ist reserviert</p>'
    + '</div>'
    + '<div style="padding:36px 32px">'
    + '<p style="font-size:16px;color:#333;margin:0 0 8px">Namaskaram <strong>' + data.fullName + '</strong> &#x1F64F;</p>'
    + '<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">Vielen Dank für deine Anmeldung zu <strong style="color:#371964">' + programName + '</strong>. Es freut mich sehr, diese yogische Praxis mit dir teilen zu dürfen.</p>'
    + '<div style="background:#f8f5ff;border-radius:10px;padding:24px;margin:0 0 8px">'
    + '<p style="margin:0 0 12px;color:#371964;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600">Deine Anmeldung</p>'
    + '<table style="width:100%;border-collapse:collapse">' + infoRows + '</table>'
    + '</div>'
    + btnHtml
    + '<p style="font-size:13px;color:#999;text-align:center;margin:0 0 24px">Zahle sofort und sichere deine Teilnahme.</p>'
    + '<div style="border-top:1px solid #eee;margin:24px 0"></div>'
    + '<p style="font-size:14px;color:#555;line-height:1.7">Hast du Fragen? Antworte einfach auf diese E-Mail — ich helfe dir gerne.</p>'
    + '<p style="font-size:15px;color:#371964;margin:24px 0 8px">Pranam,</p>'
    + sig
    + '</div>'
    + '</div>';
  // Subject: use plain Unicode emoji — GmailApp handles UTF-8 subjects fine
  GmailApp.sendEmail(data.email, '🙏 Anmeldung bestätigt — ' + programName,
    'Namaskaram ' + data.fullName + ', dein Platz in ' + programName + ' ist reserviert. Gesamtbetrag: EUR ' + finalPrice.toFixed(2) + (payUrl ? ' — Jetzt bezahlen: ' + payUrl : ''),
    { htmlBody: html });
  Logger.log('[EMAIL] Confirmation -> ' + data.email);
}

function sendInstructorNotification(data, programName, finalPrice, instructorEmail) {
  if (!instructorEmail) return;
  var friends = parseInt(data.friendsCount) > 0
    ? '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Freunde mitbringen</td><td style="padding:6px 12px;font-size:13px">' + data.friendsCount + (data.friendNames ? ' — ' + data.friendNames : '') + '</td></tr>'
    : '';
  var comments = data.comments
    ? '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Anmerkungen</td><td style="padding:6px 12px;font-size:13px">' + data.comments + '</td></tr>'
    : '';
  var referral = data.referredBy
    ? '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Empfohlen von</td><td style="padding:6px 12px;font-size:13px">' + data.referredBy + '</td></tr>'
    : '';
  var html =
    '<div style="font-family:Arial,sans-serif;max-width:560px">'
    + '<div style="background:#161737;padding:20px 24px;border-radius:8px 8px 0 0">'
    + '<p style="color:#8888bb;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px">Neue Buchung</p>'
    + '<h2 style="color:#ffffff;margin:6px 0 0;font-size:20px">' + data.fullName + '</h2>'
    + '<p style="color:#c8b8ef;margin:6px 0 0;font-size:14px">' + programName + '</p>'
    + '</div>'
    + '<div style="border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">E-Mail</td><td style="padding:6px 12px;font-size:13px"><a href="mailto:' + data.email + '" style="color:#371964">' + data.email + '</a></td></tr>'
    + '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Telefon</td><td style="padding:6px 12px;font-size:13px">' + data.phone + '</td></tr>'
    + '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Programm</td><td style="padding:6px 12px;font-size:13px"><strong>' + programName + '</strong></td></tr>'
    + '<tr><td style="padding:6px 12px;color:#666;background:#f9f9f9;font-size:13px">Betrag</td><td style="padding:6px 12px"><strong style="color:#0A5A41;font-size:16px">EUR ' + finalPrice.toFixed(2) + '</strong></td></tr>'
    + friends + referral + comments
    + '</table>'
    + '</div>'
    + '<p style="font-size:11px;color:#bbb;margin-top:12px">Gebucht über die InneREvolution-Website</p>'
    + '</div>';
  GmailApp.sendEmail(instructorEmail,
    '[Neue Buchung] ' + data.fullName + ' — ' + programName + ' (EUR ' + finalPrice.toFixed(2) + ')',
    'Neue Buchung: ' + data.fullName + ' | ' + data.email + ' | ' + programName + ' | EUR ' + finalPrice.toFixed(2),
    { htmlBody: html });
  Logger.log('[EMAIL] Instructor notified');
}

function sendIntakeForm(name, email, programName) {
  var cfg = getConfig();
  var intakeUrl = cfg.INTAKE_FORM_URL || 'https://innerevolutionyoga.life/intake';
  // Signature — matches sendClientConfirmation style
  var sig =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0d1830;border-radius:10px;overflow:hidden;border:1px solid #2e2a22;margin-top:8px;">'
    + '<tr>'
    + '<td width="80" bgcolor="#0d1830" style="background:#0d1830;padding:16px 0 16px 16px;vertical-align:middle;">'
    + '<img src="https://innerevolutionyoga.life/images/signature/NicoSchlagerProfileYoga.png" width="64" height="64" style="display:block;border-radius:4px;" />'
    + '</td>'
    + '<td bgcolor="#0d1830" style="background:#0d1830;padding:14px 12px;vertical-align:middle;">'
    + '<div style="color:#D6CEBC;font-size:15px;font-weight:bold;letter-spacing:0.5px;margin:0 0 2px;font-family:Georgia,serif;">Nico Schlager</div>'
    + '<div style="color:#a0987e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 5px;font-family:Georgia,serif;">Klassisches Hatha Yoga</div>'
    + '<div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#D6CEBC;margin:0 0 6px;font-family:Georgia,serif;">INNE<span style="font-size:18px;line-height:0;vertical-align:middle;position:relative;top:-1px;color:#fff;">&reg;</span>EVOLUTION</div>'
    + '<a href="https://innerevolutionyoga.life/de" style="color:#9ab4d8;font-size:11px;text-decoration:none;font-weight:bold;display:block;margin:0 0 8px;font-family:Georgia,serif;">innerevolutionyoga.life</a>'
    + '<table cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td style="padding-right:8px;"><a href="https://wa.me/qr/3CTAALSBOSBXH1" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_whatsapp.png" width="20" height="20" style="display:block;" /></a></td>'
    + '<td style="padding-right:8px;"><a href="https://www.instagram.com/innerevolution.yoga" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_instagram.png" width="20" height="20" style="display:block;" /></a></td>'
    + '<td><a href="https://innerevolutionyoga.life/de" target="_blank"><img src="https://innerevolutionyoga.life/images/signature/icon_globe.png" width="20" height="20" style="display:block;" /></a></td>'
    + '</tr></table>'
    + '</td>'
    + '<td width="72" bgcolor="#0d1830" style="background:#0d1830;padding:16px 16px 16px 0;vertical-align:middle;text-align:center;">'
    + '<img src="https://innerevolutionyoga.life/images/signature/Logo%20Mystical%20Simple%20Cut%20Reduced.png" width="48" style="display:block;margin:0 auto;opacity:0.95;" />'
    + '</td>'
    + '</tr>'
    + '</table>';
  var html =
    '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">'
    + '<div style="background:linear-gradient(135deg,#0A5A41 0%,#1a8a60 100%);padding:40px 32px;text-align:center">'
    + '<p style="color:#a8dfc9;margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase">InneREvolution Yoga</p>'
    + '<h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:300;letter-spacing:1px">Zahlung best&#228;tigt</h1>'
    + '<p style="color:#d4f0e7;margin:12px 0 0;font-size:16px">&#9989; Du bist dabei!</p>'
    + '</div>'
    + '<div style="padding:36px 32px">'
    + '<p style="font-size:16px;color:#333;margin:0 0 8px">Namaskaram <strong>' + name + '</strong> &#128591;&#127996;</p>'
    + '<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">Deine Zahlung f&#252;r <strong style="color:#371964">' + programName + '</strong> wurde erfolgreich empfangen. Dein Platz ist nun offiziell gesichert. &#127881;</p>'
    + '<div style="background:#f8f5ff;border-radius:10px;padding:24px;margin:0 0 28px">'
    + '<p style="margin:0 0 16px;color:#371964;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600">Deine n&#228;chsten Schritte</p>'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:10px 0;vertical-align:top;width:36px;font-size:18px;font-weight:bold;color:#371964">1.</td><td style="padding:10px 0;font-size:14px;color:#444;line-height:1.6"><strong>F&#252;lle das Intake-Formular aus</strong><br>Das hilft uns, dich besser kennenzulernen und das beste Erlebnis f&#252;r dich vorzubereiten.</td></tr>'
    + '<tr><td style="padding:10px 0;vertical-align:top;font-size:18px;font-weight:bold;color:#371964">2.</td><td style="padding:10px 0;font-size:14px;color:#444;line-height:1.6"><strong>Trag das Datum in deinen Kalender ein</strong><br>Du erh&#228;ltst rechtzeitig eine Erinnerung mit allen Details zu Ort und Ablauf.</td></tr>'
    + '<tr><td style="padding:10px 0;vertical-align:top;font-size:18px;font-weight:bold;color:#371964">3.</td><td style="padding:10px 0;font-size:14px;color:#444;line-height:1.6"><strong>Komm mit einem offenen Herzen</strong><br>Trage bequeme Kleidung und bringe eine Wasserflasche mit. Ein Notizbuch ist willkommen.</td></tr>'
    + '</table>'
    + '</div>'
    + '<div style="text-align:center;margin:0 0 32px">'
    + '<p style="font-size:14px;color:#555;margin:0 0 20px">Bitte f&#252;lle das Formular vor der ersten Session aus:</p>'
    + '<a href="' + intakeUrl + '" style="display:inline-block;background:linear-gradient(135deg,#371964,#5a2d8a);color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:0.5px">Intake-Formular ausf&#252;llen &#8594;</a>'
    + '</div>'
    + '<div style="border-top:1px solid #eee;margin:24px 0"></div>'
    + '<p style="font-size:14px;color:#555;line-height:1.7">Hast du Fragen? Antworte einfach auf diese E-Mail &#8212; ich bin f&#252;r dich da.</p>'
    + '<p style="font-size:15px;color:#371964;margin:24px 0 0">Pranam,</p>'
    + sig
    + '</div>'
    + '</div>';
  GmailApp.sendEmail(email,
    '✅ Zahlung bestätigt — Willkommen bei ' + programName + '!',
    'Namaskaram ' + name + ', deine Zahlung fuer ' + programName + ' wurde bestaetigt. Bitte fuelle das Intake-Formular aus: ' + intakeUrl,
    { htmlBody: html });
  Logger.log('[INTAKE] Form sent to ' + email);
}

// ─── STRIPE WEBHOOK (Bug #2 fix: defined ss variable properly) ────────────────
function handleStripeWebhook(event) {
  try {
    var cfg = getConfig();

    // R1: since Apps Script doPost can't read the Stripe-Signature header,
    // re-fetch this event from Stripe's API to verify it actually exists
    // and we're not being spoofed. This is the standard Apps Script pattern.
    if (!cfg.STRIPE_KEY) {
      Logger.log('[WEBHOOK] FAIL: no STRIPE_KEY configured — rejecting');
      return jsonResponse({ received: false, error: 'not_configured' });
    }
    if (!event || !event.id) {
      Logger.log('[WEBHOOK] FAIL: event has no id');
      return jsonResponse({ received: false, error: 'no_event_id' });
    }
    var verifyResp;
    try {
      verifyResp = UrlFetchApp.fetch('https://api.stripe.com/v1/events/' + encodeURIComponent(event.id), {
        method: 'get',
        headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
        muteHttpExceptions: true
      });
    } catch (fe) {
      logError('handleStripeWebhook:fetch', fe, {id: event.id});
      return jsonResponse({ received: false, error: 'verify_failed' });
    }
    if (verifyResp.getResponseCode() !== 200) {
      Logger.log('[WEBHOOK] FAIL: event not found in Stripe — possible spoof. id=' + event.id);
      logError('handleStripeWebhook:spoof', new Error('event not in Stripe'), {id: event.id, code: verifyResp.getResponseCode()});
      return jsonResponse({ received: false, error: 'event_not_found' });
    }
    var verified = JSON.parse(verifyResp.getContentText());
    if (verified.type !== event.type) {
      Logger.log('[WEBHOOK] FAIL: verified type mismatch (' + verified.type + ' vs ' + event.type + ')');
      return jsonResponse({ received: false, error: 'type_mismatch' });
    }
    // Use the VERIFIED payload (not the posted one)
    var obj = verified.data && verified.data.object;
    if (!obj) {
      return jsonResponse({ received: true, note: 'no object' });
    }

    // Only act on paid events
    var eventType = verified.type;
    var isPaid = (eventType === 'checkout.session.completed' && (obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required'))
              || (eventType === 'payment_intent.succeeded')
              || (eventType === 'charge.succeeded' && obj.paid === true);
    if (!isPaid) {
      Logger.log('[WEBHOOK] Ignoring non-paid event: ' + eventType);
      return jsonResponse({ received: true, note: 'ignored_non_paid' });
    }

    // R2: match by client_reference_id (= Booking ID) first; fall back to email
    var clientRef = obj.client_reference_id || '';
    var email = (obj.customer_details && obj.customer_details.email) || obj.receipt_email || obj.customer_email || '';

    var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
    var book = ss.getSheetByName('📋 Buchungen') || ss.getSheetByName('Bookings');
    if (!book) return jsonResponse({ received: false, error: 'no_buchungen' });
    var B = COLS.BUCHUNGEN;
    var rows = book.getDataRange().getValues();

    var matched = false;
    for (var r = 1; r < rows.length; r++) {
      var rowBookingId = String(rows[r][B.BOOKING_ID] || '').trim();
      var rowEmail     = String(rows[r][B.EMAIL] || '').toLowerCase().trim();
      var alreadyPaid  = String(rows[r][B.BEZAHLT] || '').toUpperCase() === 'YES';
      var cancelled    = String(rows[r][B.STATUS] || '').toLowerCase() === 'cancelled';
      if (cancelled) continue;
      var match = false;
      if (clientRef && rowBookingId === String(clientRef).trim()) match = true;
      // Email fallback ONLY if no client_reference_id provided (backwards compat)
      else if (!clientRef && email && rowEmail === String(email).toLowerCase() && !alreadyPaid) match = true;
      if (!match) continue;
      matched = true;
      if (alreadyPaid) {
        Logger.log('[PAID] Already marked paid, skipping: ' + rowBookingId);
        break;
      }
      book.getRange(r + 1, B.BEZAHLT + 1).setValue('YES');
      Logger.log('[PAID] ' + rowBookingId + ' / ' + rowEmail);
      try {
        sendIntakeForm(rows[r][B.NAME], rowEmail, rows[r][B.KURSNAME]);
        book.getRange(r + 1, B.INTAKE_SENT + 1).setValue('YES');
      } catch (ie) { logError('sendIntakeForm', ie, {bookingId: rowBookingId}); }
      break; // matched exactly one booking
    }
    if (!matched) {
      Logger.log('[WEBHOOK] No booking matched (client_ref=' + clientRef + ', email=' + email + ')');
      logError('handleStripeWebhook:nomatch', new Error('no matching booking'), {client_ref: clientRef, email: email});
    }
    return jsonResponse({ received: true, matched: matched });
  } catch (err) {
    logError('handleStripeWebhook', err, event);
    return jsonResponse({ received: false });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─── 4. STRIPE AUTO-CREATION (Bug #3 fix: correct sheet name + column mapping) ─
function onEdit(e) {
  if (MANUAL_MODE) return;
  try {
    var sheet = e.source.getActiveSheet();
    var sheetName = sheet.getName();

    // Auto-color row by Program ID when editing relevant tabs
    if (sheetName === '🧘 Kursplanung' || sheetName === 'Programs' ||
        sheetName === '📅 Sessions' || sheetName === 'Sessions' ||
        sheetName === '📋 Buchungen' || sheetName === 'Bookings') {
      // Kursplanung: Isha Code col A (1); Buchungen: Instance ID col E (5); Sessions: Instance ID col A (1)
      var pidCol = (sheetName === '📋 Buchungen' || sheetName === 'Bookings') ? 5 : 1;
      var editedRow = e.range.getRow();
      var minRow = (sheetName === '🧘 Kursplanung' || sheetName === 'Programs') ? 4 : 2;
      if (editedRow >= minRow) {
        colorRowByProgramId(sheet, editedRow, pidCol);
      }
      if (sheetName === '📋 Buchungen' || sheetName === 'Bookings') return;
      if (sheetName === '📅 Sessions' || sheetName === 'Sessions') return;
    }

    // Bug #3 FIX: check correct sheet name (was 'Programs')
    if (sheetName !== '🧘 Kursplanung' && sheetName !== 'Programs') return;
    var row = e.range.getRow();
    var col = e.range.getColumn();
    if (row < 4) return; // Data starts at row 4

    // Bug #3 FIX: correct column mapping
    // Instance ID = col B (2), Kursname = col D (4), Preis/TN = col M (13), Stripe Link = col V (22)
    if (col !== 2 && col !== 4 && col !== 13) return; // Only trigger on relevant columns

    var instanceId   = String(sheet.getRange(row, 2).getValue() || '').trim();  // B: Instance ID
    var programName  = String(sheet.getRange(row, 4).getValue() || '').trim();  // D: Kursname
    var priceRaw     = String(sheet.getRange(row, 13).getValue() || '');        // M: Preis/TN
    var existingLink = String(sheet.getRange(row, 22).getValue() || '').trim(); // V: Stripe Link

    if (!instanceId || !programName || !priceRaw || existingLink) return;

    var price = parseFloat(priceRaw.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!price || price <= 0) return;

    var link = createStripePaymentLink(programName, Math.round(price * 100));
    if (link) {
      sheet.getRange(row, 22).setValue(link); // V: Stripe Link
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Stripe Payment Link created for ' + programName, 'InneREvolution', 5);
      Logger.log('[STRIPE] Auto-created link for ' + programName);
    }
  } catch (ex) {
    Logger.log('[onEdit ERROR] ' + ex.message);
  }
}

// ─── COLOR HELPERS ────────────────────────────────────────────────────────────
function getOrCreateIdColor(id) {
  var props = PropertiesService.getScriptProperties();
  var mapJson = props.getProperty('ID_COLOR_MAP') || '{}';
  var map;
  try { map = JSON.parse(mapJson); } catch (e) { map = {}; }
  if (!map[id]) {
    var hue = Math.random();
    var sat = 0.45 + Math.random() * 0.20;
    var lit = 0.78 + Math.random() * 0.10;
    var rgb = hslToRgbObj(hue, sat, lit);
    map[id] = 'rgb(' +
      Math.round(rgb.red * 255) + ',' +
      Math.round(rgb.green * 255) + ',' +
      Math.round(rgb.blue * 255) + ')';
    props.setProperty('ID_COLOR_MAP', JSON.stringify(map));
    Logger.log('[COLOR] New color for ' + id + ': ' + map[id]);
  }
  return map[id];
}

function hslToRgbObj(h, s, l) {
  var r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { red: Math.round(r * 1000) / 1000,
           green: Math.round(g * 1000) / 1000,
           blue: Math.round(b * 1000) / 1000 };
}

function colorRowByProgramId(sheet, rowIndex, colIndex) {
  var id = String(sheet.getRange(rowIndex, colIndex).getValue() || '').trim();
  if (!id) return;
  var color = getOrCreateIdColor(id);
  var numCols = sheet.getLastColumn() || 1;
  sheet.getRange(rowIndex, 1, 1, numCols).setBackground(color);
}

function recolorAllRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Kursplanung — Isha Code col A (1), data starts row 4
  var programs = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  if (programs) {
    var lastRow = programs.getLastRow();
    for (var r = 4; r <= lastRow; r++) { colorRowByProgramId(programs, r, 1); }
  }
  // Sessions — Instance ID col A (1), data starts row 2
  var sessions = ss.getSheetByName('📅 Sessions') || ss.getSheetByName('Sessions');
  if (sessions) {
    var lastRow2 = sessions.getLastRow();
    for (var r = 2; r <= lastRow2; r++) { colorRowByProgramId(sessions, r, 1); }
  }
  // Buchungen — Instance ID col E (5), data starts row 2
  var bookings = ss.getSheetByName('📋 Buchungen') || ss.getSheetByName('Bookings');
  if (bookings) {
    var lastRow3 = bookings.getLastRow();
    for (var r = 2; r <= lastRow3; r++) { colorRowByProgramId(bookings, r, 5); }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('All rows recolored by Program ID!', 'InneREvolution', 4);
  Logger.log('[RECOLOR] Done');
}

function createStripePaymentLink(programName, priceInCents) {
  var cfg = getConfig();
  if (!cfg.STRIPE_KEY || priceInCents <= 0) return '';
  try {
    // R7: Cache product IDs per (mode|name) so re-edits reuse the same Stripe product.
    // Price objects are cached per (mode|name|amount) so different price points create new prices but share the product.
    var props = PropertiesService.getScriptProperties();
    var mode = cfg.TEST_MODE ? 'test' : 'live';
    var productCacheKey = 'STRIPE_PRODUCT_' + mode + '_' + programName;
    var priceCacheKey   = 'STRIPE_PRICE_'   + mode + '_' + programName + '_' + priceInCents;

    // 1) Get or create product
    var productId = props.getProperty(productCacheKey);
    if (!productId) {
      var prodResp = UrlFetchApp.fetch('https://api.stripe.com/v1/products', {
        method: 'post',
        headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
        payload: { name: programName },
        muteHttpExceptions: true
      });
      var prodData = JSON.parse(prodResp.getContentText());
      if (!prodData.id) { Logger.log('[STRIPE ERR product] ' + prodResp.getContentText()); return ''; }
      productId = prodData.id;
      props.setProperty(productCacheKey, productId);
    }

    // 2) Get or create price for this product+amount
    var priceId = props.getProperty(priceCacheKey);
    if (!priceId) {
      var priceResp = UrlFetchApp.fetch('https://api.stripe.com/v1/prices', {
        method: 'post',
        headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
        payload: { unit_amount: String(priceInCents), currency: 'eur', product: productId },
        muteHttpExceptions: true
      });
      var priceData = JSON.parse(priceResp.getContentText());
      if (!priceData.id) { Logger.log('[STRIPE ERR price] ' + priceResp.getContentText()); return ''; }
      priceId = priceData.id;
      props.setProperty(priceCacheKey, priceId);
    }

    // 3) Create payment link (no caching — user expects a working link each time;
    //    Stripe will reuse logically identical ones internally)
    var linkResp = UrlFetchApp.fetch('https://api.stripe.com/v1/payment_links', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
      payload: { 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1' },
      muteHttpExceptions: true
    });
    var linkData = JSON.parse(linkResp.getContentText());
    return linkData.url || '';
  } catch (e) {
    Logger.log('[STRIPE ERR] ' + e.message);
    logError('createStripePaymentLink', e, {program: programName, price: priceInCents});
    return '';
  }
}
// ─── Bug #13 fix: correct tab name + column mapping for createAllStripeLinks ──
function createAllStripeLinks() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var rows = prog.getDataRange().getValues();
  var created = 0;
  // Data starts at row 4 (index 3)
  // [1]=Instance ID, [3]=Kursname, [12]=Preis/TN, [21]=Stripe Link (col V, 1-based=22)
  for (var r = 3; r < rows.length; r++) {
    var row = rows[r];
    if (!row[1] || !row[3] || !row[12] || row[21]) continue; // Skip if no ID/Name/Price or already has link
    var price = parseFloat(String(row[12]).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!price) continue;
    var link = createStripePaymentLink(row[3], Math.round(price * 100));
    if (link) {
      prog.getRange(r + 1, 22).setValue(link); // col V (1-based = 22)
      Utilities.sleep(300);
      created++;
    }
  }
  safeAlert('InneREvolution', 'Stripe links created: ' + created);
}

// ─── 5. FORMAT SHEET (Bug #4 fix: correct tab names + column counts) ──────────
function formatSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Bug #4 FIX: Use actual emoji tab names and correct column counts
  var TABS = {
    '🧘 Kursplanung': { hdr: '#371964', alt: '#F2EDFF', nc: 24, frozen: 3 },
    '📅 Sessions':    { hdr: '#123062', alt: '#E9F0FF', nc: 11, frozen: 1 },
    '🏷 Rabatte':     { hdr: '#0A5A41', alt: '#E4F8EF', nc:  6, frozen: 2 },
    '📋 Buchungen':   { hdr: '#5F1630', alt: '#FFEAF1', nc: 20, frozen: 1 },
  };
  var COL_WIDTHS = {
    '🧘 Kursplanung': [105, 140, 100, 205, 100, 72, 72, 112, 90, 130, 72, 90, 90, 85, 65, 90, 85, 90, 72, 40, 160, 265, 90, 240],
    '📅 Sessions':    [140, 205, 60, 112, 92, 92, 130, 60, 80, 265, 225],
    '🏷 Rabatte':     [155, 85, 325, 112, 65, 85],
    '📋 Buchungen':   [112, 152, 208, 122, 140, 188, 130, 75, 75, 85, 85, 95, 78, 95, 75, 215, 105, 155, 105, 155],
  };
  for (var tabName in TABS) {
    var cfg   = TABS[tabName];
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) continue;
    sheet.setTabColor(cfg.hdr);
    sheet.setFrozenRows(cfg.frozen);
    sheet.getBandings().forEach(function(b) { try { b.remove(); } catch(ex) {} });
    sheet.setConditionalFormatRules([]);
    var maxR = sheet.getMaxRows();
    var hdrRow = cfg.frozen;
    var bd = sheet.getRange(hdrRow, 1, maxR - hdrRow + 1, cfg.nc).applyRowBanding();
    bd.setHeaderRowColor(cfg.hdr); bd.setFirstRowColor('#ffffff'); bd.setSecondRowColor(cfg.alt);
    sheet.getRange(hdrRow, 1, 1, cfg.nc)
      .setBackground(cfg.hdr).setFontColor('#ffffff')
      .setFontWeight('bold').setFontFamily('Arial').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(hdrRow, 44);
    var dataRows = Math.min(maxR - hdrRow, 200);
    if (dataRows > 0) sheet.setRowHeights(hdrRow + 1, dataRows, 26);
    if (COL_WIDTHS[tabName]) {
      var widths = COL_WIDTHS[tabName];
      for (var ci = 0; ci < widths.length; ci++) sheet.setColumnWidth(ci + 1, widths[ci]);
    }
  }
  var dash = ss.getSheetByName('📊 Buchungs-Dashboard') || ss.getSheetByName('Dashboard');
  if (dash) dash.setTabColor('#161737');
  applyConditionalFormatting(ss);
  applyDataValidations(ss);
  safeAlert('InneREvolution', 'All tabs formatted successfully!');
}

// ─── 6. CONDITIONAL FORMATTING (Bug #5 fix: correct column positions) ─────────
function applyConditionalFormatting(ss) {
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var book = ss.getSheetByName('📋 Buchungen')    || ss.getSheetByName('Bookings');
  if (!prog || !book) return;
  function cfText(range, text, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setBold(true)
      .setRanges([range]).build();
  }
  function cfNum(range, cond, n1, n2, bg, fg) {
    var b = SpreadsheetApp.newConditionalFormatRule();
    if (cond === 'eq')  b = b.whenNumberEqualTo(n1);
    if (cond === 'gt')  b = b.whenNumberGreaterThan(n1);
    if (cond === 'bet') b = b.whenNumberBetween(n1, n2);
    return b.setBackground(bg).setFontColor(fg).setBold(true).setRanges([range]).build();
  }
  // Kursplanung data starts row 4
  var pMax = Math.max(prog.getMaxRows() - 3, 1);
  var bMax = Math.max(book.getMaxRows() - 1, 1);
  var progRules = [];
  // Bug #5 FIX: Website? is col O (15, 1-based), Freie Plätze is col W (23, 1-based)
  // Website? Yes/No (col 15 = O)
  progRules.push(cfText(prog.getRange(4, 15, pMax, 1), 'Yes',  '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(4, 15, pMax, 1), 'YES',  '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(4, 15, pMax, 1), 'No',   '#DCDCDC', '#5A5A5A'));
  progRules.push(cfText(prog.getRange(4, 15, pMax, 1), 'NO',   '#DCDCDC', '#5A5A5A'));
  // Freie Plätze (col 23 = W)
  progRules.push(cfNum(prog.getRange(4, 23, pMax, 1),  'eq',  0, 0, '#F2BBBB', '#8C1919'));
  progRules.push(cfNum(prog.getRange(4, 23, pMax, 1),  'bet', 1, 3, '#FFDAB4', '#A05000'));
  progRules.push(cfNum(prog.getRange(4, 23, pMax, 1),  'gt',  3, 0, '#B7E1CD', '#0C552D'));
  // Sprache col R (18, 1-based)
  progRules.push(cfText(prog.getRange(4, 18, pMax, 1), 'English',            '#B9D7F5', '#0F4182'));
  progRules.push(cfText(prog.getRange(4, 18, pMax, 1), 'Deutsch',            '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(4, 18, pMax, 1), 'English / Deutsch',  '#FFF3B4', '#826400'));
  prog.setConditionalFormatRules(progRules);
  // Buchungen: data starts row 2
  var bookRules = [];
  // Bezahlt col M (13)
  bookRules.push(cfText(book.getRange(2, 13, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 13, bMax, 1), 'NO',  '#F2BBBB', '#8C1919'));
  // Payment Sent col L (12)
  bookRules.push(cfText(book.getRange(2, 12, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 12, bMax, 1), 'NO',  '#FFF3B4', '#826400'));
  // Intake gesendet col N (14)
  bookRules.push(cfText(book.getRange(2, 14, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 14, bMax, 1), 'NO',  '#FFF3B4', '#826400'));
  // Freunde verifiziert col Q (17)
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'YES',     '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'PARTIAL', '#FFDAB4', '#A05000'));
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'NO',      '#F2BBBB', '#8C1919'));
  // Empfehler bestätigt col S (19)
  bookRules.push(cfText(book.getRange(2, 19, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 19, bMax, 1), 'NO',  '#DCDCDC', '#5A5A5A'));
  book.setConditionalFormatRules(bookRules);
}

// ─── 7. DATA VALIDATIONS (Bug #6 fix: correct tab names + positions) ──────────
function applyDataValidations(ss) {
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var book = ss.getSheetByName('📋 Buchungen')    || ss.getSheetByName('Bookings');
  if (!prog || !book) return;
  var n = 997; // rows of validation
  function dv(vals, strict) {
    return SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(!strict).build();
  }
  // Bug #6 FIX: Kursplanung data starts row 4
  // Website? = col O (15)
  prog.getRange(4, 15, n, 1).setDataValidation(dv(['Yes', 'No'], true));
  // Sprache = col R (18)
  prog.getRange(4, 18, n, 1).setDataValidation(dv(['English', 'Deutsch', 'English / Deutsch'], false));
  // Buchungen: data starts row 2
  // Payment Sent col L (12)
  book.getRange(2, 12, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  // Bezahlt col M (13)
  book.getRange(2, 13, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  // Intake gesendet col N (14)
  book.getRange(2, 14, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  // Freunde verifiziert col Q (17)
  book.getRange(2, 17, n, 1).setDataValidation(dv(['YES', 'PARTIAL', 'NO'], false));
  // Empfehler bestätigt col S (19)
  book.getRange(2, 19, n, 1).setDataValidation(dv(['YES', 'NO'], false));
}

// ─── 8. DASHBOARD (Bug #7 fix: correct formula references with emoji tab names) ─
function buildDashboard() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName('📊 Buchungs-Dashboard') || ss.getSheetByName('Dashboard');
  if (!dash) { safeAlert('InneREvolution', 'Dashboard tab not found.'); return; }
  dash.clearContents(); dash.clearFormats();
  dash.setTabColor('#161737'); dash.setFrozenRows(0);
  dash.setColumnWidth(1, 18);
  var dashCols = [0, 18, 150, 90, 150, 90, 150, 90, 150, 90, 150, 90, 18];
  for (var ci = 1; ci < dashCols.length; ci++) dash.setColumnWidth(ci, dashCols[ci]);
  function cell(r, c, val, bg, fg, sz, bold, align, span) {
    var rng = span > 1 ? dash.getRange(r, c, 1, span).merge() : dash.getRange(r, c);
    if (val !== null) rng.setValue(val);
    if (bg)    rng.setBackground(bg);
    if (fg)    rng.setFontColor(fg);
    if (sz)    rng.setFontSize(sz);
    if (bold)  rng.setFontWeight('bold');
    if (align) rng.setHorizontalAlignment(align);
    rng.setVerticalAlignment('middle');
    return rng;
  }
  function fml(r, c, formula, bg, fg, sz, bold, align, span) {
    var rng = span > 1 ? dash.getRange(r, c, 1, span).merge() : dash.getRange(r, c);
    rng.setFormula(formula);
    if (bg)    rng.setBackground(bg);
    if (fg)    rng.setFontColor(fg);
    if (sz)    rng.setFontSize(sz);
    if (bold)  rng.setFontWeight('bold');
    if (align) rng.setHorizontalAlignment(align);
    rng.setVerticalAlignment('middle');
    return rng;
  }
  dash.setRowHeight(1, 64);
  cell(1, 2, 'INNEREVOLUTION  —  BOOKINGS DASHBOARD', '#161737', '#ffffff', 18, true, 'center', 11);
  dash.setRowHeight(2, 10);
  dash.setRowHeight(3, 34); dash.setRowHeight(4, 54); dash.setRowHeight(5, 10);
  // Bug #7 FIX: Use single-quoted emoji tab names in formulas
  // Buchungen: B=Name, K=Final EUR, M=Bezahlt, E=Instance ID, O=Freunde Anz, Q=Freunde verif, R=Empfehlung, S=Empfehler best, N=Intake
  // Kursplanung: B=Instance ID, O=Website?, W=Freie Plätze
  var kpis = [
    { c: 2,  label: 'TOTAL BOOKINGS',    formula: "=COUNTA('📋 Buchungen'!B2:B)",                                                color: '#371964' },
    { c: 4,  label: 'CONFIRMED PAID',    formula: "=COUNTIF('📋 Buchungen'!M2:M;\"YES\")",                                       color: '#0A5A41' },
    { c: 6,  label: 'AWAITING PAYMENT',  formula: "=COUNTIF('📋 Buchungen'!M2:M;\"NO\")",                                        color: '#5F1630' },
    { c: 8,  label: 'ACTIVE PROGRAMS',   formula: "=COUNTIF('🧘 Kursplanung'!O4:O;\"Yes\")",                                     color: '#123062' },
    { c: 10, label: 'REVENUE COLLECTED', formula: "=TEXT(SUMIF('📋 Buchungen'!M2:M;\"YES\";'📋 Buchungen'!K2:K);\"EUR #.##0,00\")", color: '#5C3A00' },
  ];
  kpis.forEach(function(k) {
    cell(3, k.c, k.label,   k.color, '#ffffff',  8, true, 'center', 2);
    fml( 4, k.c, k.formula, '#ffffff', k.color, 22, true, 'center', 2);
  });
  dash.setRowHeight(6, 14);
  cell(6, 2, null, '#161737', null, null, null, null, 11);
  dash.setRowHeight(7, 38);
  cell(7, 2, 'PROGRAMS', '#371964', '#ffffff', 12, true, 'center', 11);
  dash.setRowHeight(8, 30);
  var phCols = ['Instance ID', 'Program Name', 'Spots Left', 'Bookings', 'Revenue', 'Website', 'Sprache', 'Datum', 'Ort'];
  phCols.forEach(function(h, i) { cell(8, 2 + i, h, '#5C3D99', '#ffffff', 9, true, 'center', 1); });
  for (var pi = 0; pi < 12; pi++) {
    var pr = 9 + pi; dash.setRowHeight(pr, 25);
    var sr = pi + 4; // Data starts row 4
    var bg = pi % 2 === 0 ? '#F2EDFF' : '#ffffff';
    // Bug #7 FIX: Correct column references for Kursplanung
    // B=Instance ID, D=Kursname, W=Freie Plätze, O=Website?, R=Sprache, H=Datum, J=Ort
    var pf = [
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!B"+sr+",\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!D"+sr+",\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!W"+sr+",\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",COUNTIF('📋 Buchungen'!E:E;'🧘 Kursplanung'!B"+sr+"),\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",TEXT(SUMIF('📋 Buchungen'!E:E;'🧘 Kursplanung'!B"+sr+";'📋 Buchungen'!K:K);\"EUR #.##0,00\"),\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!O"+sr+",\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!R"+sr+",\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",TEXT('🧘 Kursplanung'!H"+sr+",\"dd mmm yyyy\"),\"\")",
      "=IF('🧘 Kursplanung'!B"+sr+"<>\"\",'🧘 Kursplanung'!J"+sr+",\"\")",
    ];
    pf.forEach(function(f, fi) {
      dash.getRange(pr, 2+fi).setFormula(f).setBackground(bg).setHorizontalAlignment('center').setFontSize(9);
    });
  }
  dash.setRowHeight(21, 14); cell(21, 2, null, '#161737', null, null, null, null, 11);
  dash.setRowHeight(22, 38);
  cell(22, 2, 'FRIEND REFERRALS', '#123062', '#ffffff', 11, true, 'center', 5);
  cell(22, 8, 'ACTION ITEMS',     '#5F1630', '#ffffff', 11, true, 'center', 4);
  dash.setRowHeight(23, 28);
  cell(23, 2, 'Metric', '#1A3D7A', '#ffffff', 9, true, 'center', 4);
  cell(23, 6, 'Count',  '#1A3D7A', '#ffffff', 9, true, 'center', 1);
  cell(23, 8, 'Item',   '#8B2040', '#ffffff', 9, true, 'center', 3);
  cell(23, 11,'Count',  '#8B2040', '#ffffff', 9, true, 'center', 1);
  // Bug #7 FIX: Correct column letters for Buchungen
  var refs = [
    ['Bookings with friends invited',  "=COUNTIF('📋 Buchungen'!O2:O;\">0\")"],
    ['Total friend spots promised',    "=SUMIF('📋 Buchungen'!O2:O;\">0\";'📋 Buchungen'!O2:O)"],
    ['Friends verified as joined',     "=COUNTIF('📋 Buchungen'!Q2:Q;\"YES\")"],
    ['Friends partially verified',     "=COUNTIF('📋 Buchungen'!Q2:Q;\"PARTIAL\")"],
    ['Bookings listing a referrer',    "=COUNTIFS('📋 Buchungen'!R2:R;\"<>\")"],
    ['Referrers confirmed in system',  "=COUNTIF('📋 Buchungen'!S2:S;\"YES\")"],
  ];
  var actions = [
    ['Unpaid bookings',                 "=COUNTIF('📋 Buchungen'!M2:M;\"NO\")"],
    ['Intake forms not yet sent',       "=COUNTIF('📋 Buchungen'!N2:N;\"NO\")"],
    ['Programs fully booked (0 spots)', "=COUNTIF('🧘 Kursplanung'!W4:W;0)"],
    ['Programs with 1-3 spots left',    "=COUNTIFS('🧘 Kursplanung'!W4:W;\"<=3\";'🧘 Kursplanung'!W4:W;\">0\")"],
    ['Friend referrals unverified',     "=COUNTIF('📋 Buchungen'!Q2:Q;\"NO\")"],
    ['Referrers unconfirmed',           "=COUNTIF('📋 Buchungen'!S2:S;\"NO\")"],
  ];
  for (var ri = 0; ri < 6; ri++) {
    var tr = 24 + ri; dash.setRowHeight(tr, 25);
    var rbg = ri % 2 === 0 ? '#E9F0FF' : '#ffffff';
    var abg = ri % 2 === 0 ? '#FFEAF1' : '#ffffff';
    cell(tr, 2, refs[ri][0],    rbg, '#1A2B50', 9, false, 'left',   4);
    fml( tr, 6, refs[ri][1],    rbg, '#123062', 11, true, 'center', 1);
    cell(tr, 8, actions[ri][0], abg, '#3D0D1C', 9, false, 'left',   3);
    fml( tr, 11,actions[ri][1], abg, '#5F1630', 11, true, 'center', 1);
  }
  dash.setRowHeight(31, 10); cell(31, 2, null, '#161737', null, null, null, null, 11);
  dash.setRowHeight(32, 24);
  cell(32, 2, 'Last rebuilt: ' + new Date().toLocaleString(), null, '#aaaaaa', 9, false, 'left', 6);
  cell(32, 9, 'InneREvolution Booking System v4', null, '#aaaaaa', 9, false, 'right', 3);
  safeAlert('InneREvolution', 'Dashboard rebuilt!');
}

// ─── 9. FRIEND REFERRAL CHECK (Bug #8 fix: verified indices + safeAlert) ──────
function checkFriendReferrals() {
  if (MANUAL_MODE) return;
  var cfg  = getConfig();
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var book = ss.getSheetByName('📋 Buchungen') || ss.getSheetByName('Bookings');
  var data = book.getDataRange().getValues();
  // Bug #8 FIX: verified column indices match Buchungen layout
  // [1]=Name, [14]=Freunde Anz, [15]=Freunde Namen, [16]=Freunde verifiziert
  // [17]=Empfehlung von, [18]=Empfehler bestätigt. Data starts at index 1.
  var booked = {};
  for (var r = 1; r < data.length; r++) {
    if (data[r][1]) booked[String(data[r][1]).toLowerCase().trim()] = true;
  }
  var updates = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1]) continue;
    var friendNames = String(row[15] || '');
    var friendCount = parseInt(row[14]) || 0;
    if (friendNames && friendCount > 0) {
      var names   = friendNames.split(/[,;]+/).map(function(n) { return n.toLowerCase().trim(); }).filter(Boolean);
      var matched = names.filter(function(n) { return booked[n]; }).length;
      var newQ    = matched === names.length ? 'YES' : matched > 0 ? 'PARTIAL' : 'NO';
      if (String(row[16]) !== newQ) { book.getRange(i + 1, 17).setValue(newQ); updates++; } // col Q (17)
    }
    var referrer = String(row[17] || '').toLowerCase().trim();
    if (referrer) {
      var newS = booked[referrer] ? 'YES' : 'NO';
      if (String(row[18]) !== newS) { book.getRange(i + 1, 19).setValue(newS); updates++; } // col S (19)
    }
  }
  Logger.log('[REFERRALS] ' + updates + ' updates applied');
  safeAlert('InneREvolution', 'Referral check complete.\n' + updates + ' cell(s) updated.');
}

// ─── 10. PAYMENT REMINDERS (Bug #9 fix: correct column mapping + safeAlert) ───
function sendPaymentReminders() {
  if (MANUAL_MODE) return;
  var cfg  = getConfig();
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var book = ss.getSheetByName('📋 Buchungen')   || ss.getSheetByName('Bookings');
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  // Bug #9 FIX: Build stripe link map from Kursplanung
  // Instance ID = col B ([1]), Stripe Link = col V ([21]). Data starts at index 3 (row 4).
  var stripeLinks = {};
  var progData = prog.getDataRange().getValues();
  for (var p = 3; p < progData.length; p++) {
    var pid = String(progData[p][1] || '').trim(); // [1] = Instance ID
    if (pid) stripeLinks[pid] = progData[p][21] || ''; // [21] = Stripe Link
  }
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 2);
  var rows = book.getDataRange().getValues();
  var sent = 0;
  // Buchungen: [0]=Datum, [1]=Name, [2]=Email, [4]=Instance ID, [5]=Kursname, [10]=Final EUR, [12]=Bezahlt
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[1] || String(row[12]).toUpperCase() !== 'NO') continue; // Skip if paid
    if (!row[0] || new Date(row[0]) >= cutoff) continue; // Skip recent bookings
    var name = row[1], email = row[2], pid = String(row[4]).trim();
    var progName = row[5], price = parseFloat(row[10]) || 0;
    var link = stripeLinks[pid] || '';
    if (link && email) link += (link.indexOf('?') >= 0 ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(email);
    try {
      var html = '<div style="font-family:Arial,sans-serif;max-width:600px">'
        + '<div style="background:#371964;padding:20px;text-align:center"><h2 style="color:#fff;margin:0">Friendly Payment Reminder</h2></div>'
        + '<div style="padding:24px"><p>Hi <strong>' + name + '</strong>,</p>'
        + '<p>Your spot in <strong>' + progName + '</strong> is reserved, but payment of <strong>EUR ' + price.toFixed(2) + '</strong> is still outstanding.</p>'
        + (link ? '<p style="text-align:center;margin:24px 0"><a href="' + link + '" style="background:#FF6B35;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold">Complete Payment</a></p>' : '')
        + '<p style="color:#666;font-size:13px">Questions? Simply reply to this email.</p>'
        + '<p>Namaste,<br><strong>Nico — InneREvolution Yoga</strong></p></div></div>';
      GmailApp.sendEmail(email, 'Payment Reminder: ' + progName,
        'Hi ' + name + ', payment of EUR ' + price.toFixed(2) + ' for ' + progName + ' is outstanding.' + (link ? ' Pay: ' + link : ''),
        { htmlBody: html });
      sent++; Logger.log('[REMINDER] -> ' + email);
    } catch(e) { Logger.log('[REMINDER ERROR] ' + email + ': ' + e.message); }
  }
  safeAlert('InneREvolution', 'Payment reminders sent: ' + sent);
}

// ─── 11. DAILY REPORT (Bug #10 fix: correct sheet/column references + safeAlert) ─
function sendDailyReport() {
  if (MANUAL_MODE) return;
  var cfg = getConfig();
  if (!cfg.INSTRUCTOR_EMAIL) { safeAlert('InneREvolution', 'Set INSTRUCTOR_EMAIL in Script Properties first.'); return; }
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var book = ss.getSheetByName('📋 Buchungen')   || ss.getSheetByName('Bookings');
  var prog = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var rows  = book.getDataRange().getValues();
  var newToday = [], unpaid = [], totalRev = 0, paidCount = 0;
  // Buchungen: [0]=Datum, [1]=Name, [2]=Email, [5]=Kursname, [10]=Final EUR, [12]=Bezahlt
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[1]) continue;
    var paid = String(row[12]).toUpperCase();
    if (row[0]) { var d = new Date(row[0]); d.setHours(0,0,0,0); if (d.getTime() === today.getTime()) newToday.push(row); }
    if (paid === 'NO')  unpaid.push(row);
    if (paid === 'YES') { paidCount++; totalRev += parseFloat(row[10]) || 0; }
  }
  // Kursplanung: [14]=Website? (col O). Data starts at index 3.
  var progRows = prog.getDataRange().getValues();
  var activeProgs = 0;
  for (var pi = 3; pi < progRows.length; pi++) {
    if (String(progRows[pi][14]).toUpperCase() === 'YES') activeProgs++;
  }
  function trRow(cells, bg) {
    return '<tr style="background:' + bg + '">' + cells.map(function(c) { return '<td style="padding:6px 10px;border-bottom:1px solid #eee">' + c + '</td>'; }).join('') + '</tr>';
  }
  var html = '<div style="font-family:Arial,sans-serif;max-width:700px">'
    + '<div style="background:#161737;padding:28px;text-align:center"><h1 style="color:#fff;margin:0;font-size:20px">InneREvolution Daily Report</h1>'
    + '<p style="color:#8888bb;margin:8px 0 0">' + today.toDateString() + '</p></div>'
    + '<div style="padding:24px"><h2 style="color:#371964;border-left:4px solid #371964;padding-left:10px">Overview</h2>'
    + '<table style="width:100%;border-collapse:collapse">'
    + trRow(['Total confirmed (paid) bookings', '<strong>' + paidCount + '</strong>'], '#F2EDFF')
    + trRow(['Total revenue collected', '<strong style="color:#0A5A41;font-size:16px">EUR ' + totalRev.toFixed(2) + '</strong>'], '#fff')
    + trRow(['Awaiting payment', '<strong style="color:' + (unpaid.length > 0 ? '#8C1919' : '#0C552D') + '">' + unpaid.length + '</strong>'], '#F2EDFF')
    + trRow(['Active programs', '<strong>' + activeProgs + '</strong>'], '#fff')
    + trRow(['New bookings today', '<strong>' + newToday.length + '</strong>'], '#F2EDFF')
    + '</table>';
  if (newToday.length > 0) {
    html += '<h2 style="color:#371964;margin-top:24px;border-left:4px solid #371964;padding-left:10px">New Today (' + newToday.length + ')</h2>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<tr style="background:#371964;color:#fff"><th style="padding:8px">Name</th><th>Program</th><th>EUR</th><th>Paid?</th></tr>'
      + newToday.map(function(r, i) { return trRow([r[1], r[5], (parseFloat(r[10])||0).toFixed(2), r[12]], i%2===0?'#F2EDFF':'#fff'); }).join('')
      + '</table>';
  }
  if (unpaid.length > 0) {
    html += '<h2 style="color:#5F1630;margin-top:24px;border-left:4px solid #5F1630;padding-left:10px">Awaiting Payment (' + unpaid.length + ')</h2>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<tr style="background:#5F1630;color:#fff"><th style="padding:8px">Name</th><th>Email</th><th>Program</th><th>EUR</th></tr>'
      + unpaid.slice(0,15).map(function(r, i) { return trRow([r[1], r[2], r[5], (parseFloat(r[10])||0).toFixed(2)], i%2===0?'#FFEAF1':'#fff'); }).join('')
      + '</table>';
  }
  html += '<p style="margin-top:32px;color:#aaa;font-size:11px;text-align:center">InneREvolution Yoga — Automated Daily Report v4</p></div></div>';
  GmailApp.sendEmail(cfg.INSTRUCTOR_EMAIL,
    'InneREvolution Daily Report — ' + today.toDateString(),
    paidCount + ' paid | EUR ' + totalRev.toFixed(2) + ' revenue | ' + unpaid.length + ' unpaid',
    { htmlBody: html });
  Logger.log('[REPORT] Sent to ' + cfg.INSTRUCTOR_EMAIL);
  safeAlert('InneREvolution', 'Daily report sent to ' + cfg.INSTRUCTOR_EMAIL);
}

// ─── 12. TRIGGER SETUP ───────────────────────────────────────────────────────
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDailyReport'       ).timeBased().atHour(8 ).everyDays(1).create();
  ScriptApp.newTrigger('checkFriendReferrals'  ).timeBased().atHour(9 ).everyDays(1).create();
  ScriptApp.newTrigger('sendPaymentReminders'  ).timeBased().atHour(10).everyDays(1).create();
  ScriptApp.newTrigger('syncSessionsToCalendar').timeBased().atHour(0 ).everyDays(1).create();
  Logger.log('[TRIGGERS] 4 triggers installed');
  safeAlert('InneREvolution',
    'Automation triggers installed:\n\n'
    + '  08:00  Daily instructor report\n'
    + '  09:00  Friend referral check (auto-updates col Q + S)\n'
    + '  10:00  Payment reminders\n'
    + '  00:00  Calendar sync\n\n'
    + 'All run daily automatically.');
}

// ─── 13. AUTHORIZE & TEST ─────────────────────────────────────────────────────
function authorizeAndTest() {
  var cfg = getConfig();
  var ok = [], errors = [];
  try {
    var ss = SpreadsheetApp.openById(cfg.SHEET_ID);
    var bookSheet = ss.getSheetByName('📋 Buchungen') || ss.getSheetByName('Bookings');
    var n = bookSheet ? bookSheet.getLastRow() : 0;
    ok.push('[OK] Sheets: ' + n + ' rows in Buchungen');
  } catch(e) { errors.push('[FAIL] Sheets: ' + e.message); }
  try { GmailApp.getInboxUnreadCount(); ok.push('[OK] Gmail: authorized'); }
  catch(e) { errors.push('[FAIL] Gmail: ' + e.message); }
  if (cfg.CALENDAR_ID) {
    try { CalendarApp.getCalendarById(cfg.CALENDAR_ID); ok.push('[OK] Calendar: authorized'); }
    catch(e) { errors.push('[FAIL] Calendar: ' + e.message); }
  } else { ok.push('[--] Calendar: CALENDAR_ID not set (optional)'); }
  ok.push(cfg.STRIPE_KEY ? '[OK] Stripe key: set' : '[--] Stripe key: not set — add STRIPE_KEY to Script Properties');
  ok.push(cfg.STRIPE_WEBHOOK_SECRET ? '[OK] Webhook secret: set' : '[--] Webhook secret: not set');
  ok.push(cfg.API_TOKEN ? '[OK] API_TOKEN: set (website must send it)' : '[!!] API_TOKEN: NOT set — anyone can POST bookings');
  ok.push(cfg.CANCELLATION_SECRET ? '[OK] CANCELLATION_SECRET: set' : '[--] CANCELLATION_SECRET: not set — cancel links disabled');
  safeAlert('Authorization Test', ok.join('\n') + (errors.length ? '\n\n' + errors.join('\n') : ''));
}

// ─── 14. CALENDAR SYNC (Bug #11 fix: correct column mapping + safeAlert) ─────
function syncSessionsToCalendar() {
  if (MANUAL_MODE) return;
  var cfg = getConfig();
  if (!cfg.CALENDAR_ID) { safeAlert('InneREvolution', 'CALENDAR_ID not set in Script Properties.'); return; }
  var ss      = SpreadsheetApp.openById(cfg.SHEET_ID);
  var sesSh   = ss.getSheetByName('📅 Sessions')    || ss.getSheetByName('Sessions');
  var progSh  = ss.getSheetByName('🧘 Kursplanung') || ss.getSheetByName('Programs');
  var sesData = sesSh.getDataRange().getValues();
  var cal     = CalendarApp.getCalendarById(cfg.CALENDAR_ID);
  if (!cal) { safeAlert('InneREvolution', 'Calendar not found — check CALENDAR_ID.'); return; }
  // Build prog name map from Kursplanung: [1]=Instance ID, [3]=Kursname. Data starts index 3.
  var progMap = {};
  var progData = progSh.getDataRange().getValues();
  for (var p = 3; p < progData.length; p++) {
    var pid = String(progData[p][1] || '').trim();
    if (pid) progMap[pid] = progData[p][3] || pid; // Kursname or fallback to ID
  }
  var created = 0, updated = 0, skipped = 0;
  // Bug #11 FIX: Sessions column mapping
  // [0]=Instance ID, [1]=Kursname, [2]=Session#, [3]=Datum, [4]=Start time, [5]=End time
  // [9]=Notizen, [10]=CalEventID. Data starts at index 1 (row 2).
  for (var r = 1; r < sesData.length; r++) {
    var row = sesData[r];
    var instanceId = String(row[0] || '').trim();
    var sesNum  = row[2];           // [2] Session#
    var dateRaw = row[3];           // [3] Datum
    var tStart  = row[4];           // [4] Start time
    var tEnd    = row[5];           // [5] End time
    var notes   = row[9] || '';     // [9] Notizen
    var evId    = String(row[10] || '').trim(); // [10] CalEventID
    if (!instanceId || !dateRaw) { skipped++; continue; }
    var sessionDate = parseSheetDate(dateRaw);
    if (!sessionDate) { skipped++; continue; }
    var startDt = buildDateTime(sessionDate, tStart);
    var endDt   = buildDateTime(sessionDate, tEnd || tStart);
    if (!startDt) { skipped++; continue; }
    var progName = progMap[instanceId] || row[1] || instanceId;
    var title    = progName + (sesNum ? ' — Session ' + sesNum : '');
    var desc     = notes || (progName + ' / Session ' + sesNum);
    try {
      if (evId) {
        try {
          var ev = cal.getEventById(evId);
          if (ev) { ev.setTitle(title); ev.setTime(startDt, endDt); ev.setDescription(desc); updated++; }
          else throw new Error('not found');
        } catch(ex) {
          var ne = cal.createEvent(title, startDt, endDt, { description: desc });
          sesSh.getRange(r + 1, 11).setValue(ne.getId()); created++; // col K (11, 1-based)
        }
      } else {
        var ne2 = cal.createEvent(title, startDt, endDt, { description: desc });
        sesSh.getRange(r + 1, 11).setValue(ne2.getId()); created++; // col K (11, 1-based)
      }
    } catch(e) { Logger.log('[CALENDAR ERROR] row ' + (r+1) + ': ' + e.message); skipped++; }
  }
  Logger.log('[CALENDAR] created=' + created + ' updated=' + updated + ' skipped=' + skipped);
  safeAlert('InneREvolution',
    'Calendar sync complete:\nCreated: ' + created + '\nUpdated: ' + updated + '\nSkipped: ' + skipped);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseSheetDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400000));
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function buildDateTime(base, timeVal) {
  if (!base) return null;
  var d = new Date(base);
  if (timeVal === undefined || timeVal === null || timeVal === '') return d;
  var mins;
  if (typeof timeVal === 'number') {
    mins = Math.round(timeVal * 24 * 60);
  } else if (timeVal instanceof Date) {
    mins = timeVal.getHours() * 60 + timeVal.getMinutes();
  } else if (typeof timeVal === 'string' && timeVal.indexOf(':') >= 0) {
    var p = timeVal.split(':');
    mins = parseInt(p[0]) * 60 + parseInt(p[1] || 0);
  } else { return d; }
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}
