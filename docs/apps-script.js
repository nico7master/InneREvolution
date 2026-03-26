/**
 * InneREvolution — Google Apps Script (Full Suite v3)
 * ─────────────────────────────────────────────────────
 * AUTOMATION OVERVIEW (what is automatic vs manual):
 *
 *   AUTOMATIC (no action needed from you):
 *   - Payment Sent     → YES when booking submitted (confirmation email sent immediately)
 *   - Paid             → YES when Stripe webhook fires after payment
 *   - Intake Form Sent → YES when Stripe webhook fires (sent after payment confirmed)
 *   - Friends Verified → checked daily 09:00 by checkFriendReferrals()
 *   - Referrer Verified→ checked daily 09:00 by checkFriendReferrals()
 *   - Spots Left       → decremented on each booking
 *   - Stripe Link      → auto-created by onEdit() when you fill Program ID+Name+Price
 *   - Start/End Date   → formula in sheet pulling from Sessions tab
 *
 *   MANUAL (you fill in):
 *   - All Programs fields except Spots Left, Start Date, End Date, Stripe Link
 *   - Sessions rows (except Calendar Event ID)
 *   - Discount Codes
 *
 * Script Properties required:
 *   SHEET_ID, CALENDAR_ID, STRIPE_KEY, INSTRUCTOR_EMAIL
 */

// ─── 0. CONFIG ────────────────────────────────────────────────────────────────
function getConfig() {
  var p = PropertiesService.getScriptProperties().getProperties();
  return {
    SHEET_ID:         p.SHEET_ID         || SpreadsheetApp.getActiveSpreadsheet().getId(),
    CALENDAR_ID:      p.CALENDAR_ID      || '',
    STRIPE_KEY:       p.STRIPE_KEY       || '',
    INSTRUCTOR_EMAIL: p.INSTRUCTOR_EMAIL || Session.getActiveUser().getEmail(),
  };
}

// ─── 1. MENU ──────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('InneREvolution')
    .addItem('Format All Tabs',            'formatSheet')
    .addItem('Rebuild Dashboard',          'buildDashboard')
    .addSeparator()
    .addItem('Sync Sessions to Calendar',  'syncSessionsToCalendar')
    .addSeparator()
    .addItem('Check Friend Referrals',     'checkFriendReferrals')
    .addItem('Send Payment Reminders',     'sendPaymentReminders')
    .addItem('Send Daily Report',          'sendDailyReport')
    .addSeparator()
    .addItem('Create Missing Stripe Links', 'createAllStripeLinks')
    .addItem('Recolor All Rows by Program ID',  'recolorAllRows')
    .addSeparator()
    .addItem('Setup Automation Triggers',  'setupTriggers')
    .addItem('Authorize & Test',           'authorizeAndTest')
    .addToUi();
}

// ─── 2. WEB APP ───────────────────────────────────────────────────────────────
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'fixLanguage' && params.secret === 'ir2026fix') {
    fixLanguageValues();
    return ContentService.createTextOutput('Language values updated.');
  }
  return ContentService.createTextOutput('InneREvolution Booking API — OK');
}

function doPost(e) {
  Logger.log('[REQUEST] doPost received');
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type && data.type.indexOf('payment_intent') === 0) return handleStripeWebhook(data);
    return handleBooking(data);
  } catch (err) {
    Logger.log('[ERROR] doPost: ' + err.message);
    return jsonResponse({ success: false, error: err.message });
  }
}

function handleBooking(data) {
  var cfg  = getConfig();
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var prog = ss.getSheetByName('Programs');
  var disc = ss.getSheetByName('Discount Codes');
  var book = ss.getSheetByName('Bookings');

  var required = ['programId', 'fullName', 'email', 'phone'];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]]) return jsonResponse({ success: false, error: 'Missing: ' + required[i] });
  }

  var progData = prog.getDataRange().getValues();
  var progRow  = null;
  for (var r = 1; r < progData.length; r++) {
    if (String(progData[r][0]).trim() === String(data.programId).trim()) { progRow = progData[r]; break; }
  }
  if (!progRow) return jsonResponse({ success: false, error: 'Program not found: ' + data.programId });

  var basePrice   = parseFloat(String(progRow[2]).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  var spotsLeft   = parseInt(progRow[4]);
  var programName = progRow[1];
  var stripeLink  = progRow[8] || '';

  if (!isNaN(spotsLeft) && spotsLeft <= 0)
    return jsonResponse({ success: false, error: 'This program is fully booked.' });

  var codeDiscount = 0, usedCode = '';
  if (data.discountCode) {
    var discData = disc.getDataRange().getValues();
    for (var d = 1; d < discData.length; d++) {
      if (String(discData[d][0]).toUpperCase() === String(data.discountCode).toUpperCase()) {
        codeDiscount = parseFloat(discData[d][1]) || 0;
        usedCode = discData[d][0];
        break;
      }
    }
  }

  var friendsPct = parseFloat(data.friendsDiscountPct) || 0;
  var totalDisc  = Math.min(codeDiscount + friendsPct, 50);
  var finalPrice = Math.round(basePrice * (1 - totalDisc / 100) * 100) / 100;

  book.appendRow([
    new Date(),          // A: Timestamp — AUTO
    data.fullName,       // B: Full Name
    data.email,          // C: Email
    data.phone,          // D: Phone
    data.programId,      // E: Program ID
    programName,         // F: Program Name
    usedCode,            // G: Discount Code
    codeDiscount,        // H: Code Discount %
    friendsPct,          // I: Friends Discount %
    totalDisc,           // J: Total Discount %
    finalPrice,          // K: Final Price
    'YES',               // L: Payment Sent — YES because confirmation email sent immediately below
    'NO',                // M: Paid — set to YES automatically by Stripe webhook
    'NO',                // N: Intake Form Sent — set to YES automatically by Stripe webhook after payment
    data.friendsCount || 0,
    data.friendNames  || '',
    'NO',                // Q: Friends Verified — updated daily by checkFriendReferrals()
    data.referredBy   || '',
    'NO',                // S: Referrer Verified — updated daily by checkFriendReferrals()
  ]);

  if (!isNaN(spotsLeft)) {
    for (var pr = 1; pr < progData.length; pr++) {
      if (String(progData[pr][0]).trim() === String(data.programId).trim()) {
        prog.getRange(pr + 1, 5).setValue(spotsLeft - 1); break;
      }
    }
  }

  var payUrl = stripeLink;
  if (stripeLink && data.email)
    payUrl += (stripeLink.indexOf('?') >= 0 ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(data.email);

  try { sendClientConfirmation(data, programName, finalPrice, totalDisc, payUrl); }
  catch(err) { Logger.log('[EMAIL ERR] ' + err.message); }
  try { sendInstructorNotification(data, programName, finalPrice, cfg.INSTRUCTOR_EMAIL); }
  catch(err) { Logger.log('[EMAIL ERR] ' + err.message); }

  Logger.log('[OK] Booked: ' + data.fullName + ' / ' + programName + ' EUR ' + finalPrice);
  return jsonResponse({ success: true, paymentUrl: payUrl, programName: programName, finalPrice: finalPrice });
}

// ─── 3. EMAILS ────────────────────────────────────────────────────────────────
function sendClientConfirmation(data, programName, finalPrice, discountPct, payUrl) {
  var discHtml = discountPct > 0
    ? '<p style="color:#5F1630"><strong>' + discountPct + '% discount applied</strong></p>' : '';
  var btnHtml = payUrl
    ? '<p style="text-align:center;margin:24px 0"><a href="' + payUrl + '" style="background:#FF6B35;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">Complete Payment</a></p>' : '';
  var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
    + '<div style="background:#371964;padding:32px 24px;text-align:center"><h1 style="color:#ffffff;margin:0;font-size:22px">InneREvolution Yoga</h1><p style="color:#c8b8ef;margin:8px 0 0">Registration Confirmed</p></div>'
    + '<div style="padding:24px;background:#fafafa">'
    + '<p>Dear <strong>' + data.fullName + '</strong>,</p>'
    + '<p>Thank you for registering for <strong>' + programName + '</strong>.</p>'
    + discHtml
    + '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:16px 0">'
    + '<p style="margin:4px 0"><strong>Program:</strong> ' + programName + '</p>'
    + '<p style="margin:4px 0"><strong>Total due:</strong> <span style="color:#371964;font-size:18px;font-weight:bold">EUR ' + finalPrice.toFixed(2) + '</span></p>'
    + '</div>' + btnHtml
    + '<p style="color:#666;font-size:13px">Questions? Just reply to this email.</p>'
    + '<p>Namaste,<br><strong>Nico — InneREvolution Yoga</strong></p></div></div>';
  GmailApp.sendEmail(data.email, 'Registration Confirmed: ' + programName,
    'Thank you for registering. Total: EUR ' + finalPrice.toFixed(2), { htmlBody: html });
  Logger.log('[EMAIL] Confirmation -> ' + data.email);
}

function sendInstructorNotification(data, programName, finalPrice, instructorEmail) {
  if (!instructorEmail) return;
  var friends = parseInt(data.friendsCount) > 0 ? ' (+ ' + data.friendsCount + ' friend(s))' : '';
  GmailApp.sendEmail(instructorEmail,
    '[New Booking] ' + data.fullName + ' - ' + programName,
    'Name: ' + data.fullName + '\nEmail: ' + data.email + '\nPhone: ' + data.phone
    + '\nProgram: ' + programName + '\nPrice: EUR ' + finalPrice.toFixed(2) + friends
    + '\nReferral: ' + (data.referredBy || 'none'));
  Logger.log('[EMAIL] Instructor notified');
}

/**
 * Sends intake form email after payment confirmed via Stripe webhook.
 * Called automatically — no manual action needed.
 */
function sendIntakeForm(name, email, programName) {
  var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
    + '<div style="background:#371964;padding:32px 24px;text-align:center">'
    + '<h1 style="color:#ffffff;margin:0;font-size:22px">InneREvolution Yoga</h1>'
    + '<p style="color:#c8b8ef;margin:8px 0 0">Payment Received — Welcome!</p></div>'
    + '<div style="padding:24px;background:#fafafa">'
    + '<p>Dear <strong>' + name + '</strong>,</p>'
    + '<p>Your payment for <strong>' + programName + '</strong> has been confirmed. You are officially registered!</p>'
    + '<p>To help us prepare the best experience for you, please complete your intake form:</p>'
    + '<p style="text-align:center;margin:24px 0"><a href="https://innerevolutionyoga.life/intake" '
    + 'style="background:#371964;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold">'
    + 'Complete Intake Form</a></p>'
    + '<p style="color:#666;font-size:13px">Please complete this before the first session. Questions? Reply to this email.</p>'
    + '<p>Namaste,<br><strong>Nico — InneREvolution Yoga</strong></p></div></div>';
  GmailApp.sendEmail(email,
    'Welcome to ' + programName + ' — Please Complete Your Intake Form',
    'Your payment is confirmed. Complete your intake form at https://innerevolutionyoga.life/intake',
    { htmlBody: html });
  Logger.log('[INTAKE] Form sent to ' + email);
}

/**
 * Stripe webhook — auto-sets Paid=YES and sends intake form.
 * Configure webhook endpoint in Stripe Dashboard to point to this Web App URL.
 */
function handleStripeWebhook(event) {
  try {
    var email = event.data && event.data.object && event.data.object.receipt_email;
    if (email) {
      var cfg  = getConfig();
      var book = SpreadsheetApp.openById(cfg.SHEET_ID).getSheetByName('Bookings');
      var rows = book.getDataRange().getValues();
      for (var r = 1; r < rows.length; r++) {
        if (String(rows[r][2]).toLowerCase() === email.toLowerCase() && rows[r][12] === 'NO') {
          book.getRange(r + 1, 13).setValue('YES'); // M: Paid = YES (automatic)
          Logger.log('[PAID] ' + email);
          try {
            sendIntakeForm(rows[r][1], email, rows[r][5]);
            book.getRange(r + 1, 14).setValue('YES'); // N: Intake Form Sent = YES (automatic)
          } catch(ie) { Logger.log('[INTAKE ERROR] ' + ie.message); }
        }
      }
    }
    return jsonResponse({ received: true });
  } catch (err) {
    Logger.log('[WEBHOOK ERROR] ' + err.message);
    return jsonResponse({ received: false });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─── 4. STRIPE AUTO-CREATION ─────────────────────────────────────────────────
/**
 * onEdit trigger — when you fill Program ID + Name + Price in Programs sheet,
 * automatically calls Stripe API and writes the Payment Link back to col I.
 * Requires STRIPE_KEY in Script Properties.
 */
function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var sheetName = sheet.getName();

    // Auto-color row by Program ID when editing Programs, Sessions or Bookings
    if (sheetName === 'Programs' || sheetName === 'Sessions' || sheetName === 'Bookings') {
      var pidCol = (sheetName === 'Bookings') ? 5 : 1;  // Bookings col E, others col A
      var editedRow = e.range.getRow();
      if (editedRow >= 2) {
        colorRowByProgramId(sheet, editedRow, pidCol);
      }
      if (sheetName === 'Bookings') return;  // no Stripe logic for Bookings
      if (sheetName === 'Sessions') return;  // no Stripe logic for Sessions
    }

    if (sheetName !== 'Programs') return;
    var row = e.range.getRow();
    var col = e.range.getColumn();
    if (row < 2 || col > 3) return;

    var programId    = String(sheet.getRange(row, 1).getValue() || '').trim();
    var programName  = String(sheet.getRange(row, 2).getValue() || '').trim();
    var priceRaw     = String(sheet.getRange(row, 3).getValue() || '');
    var existingLink = String(sheet.getRange(row, 9).getValue() || '').trim();

    if (!programId || !programName || !priceRaw || existingLink) return;

    var price = parseFloat(priceRaw.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!price || price <= 0) return;

    var link = createStripePaymentLink(programName, Math.round(price * 100));
    if (link) {
      sheet.getRange(row, 9).setValue(link);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Stripe Payment Link created for ' + programName, 'InneREvolution', 5);
      Logger.log('[STRIPE] Auto-created link for ' + programName);
    }
  } catch(ex) {
    Logger.log('[onEdit ERROR] ' + ex.message);
  }
}

// ─── COLOR HELPERS ────────────────────────────────────────────────────────────
/**
 * Get or create a random pastel color for a Program ID.
 * Colors are stored in Script Properties as JSON so they persist forever.
 * First time an ID is seen -> random color generated and saved.
 * Same ID always returns the same saved color.
 */
function getOrCreateIdColor(id) {
  var props = PropertiesService.getScriptProperties();
  var mapJson = props.getProperty('ID_COLOR_MAP') || '{}';
  var map;
  try { map = JSON.parse(mapJson); } catch(e) { map = {}; }

  if (!map[id]) {
    // Random pastel: hue fully random, saturation 45-65%, lightness 78-88%
    var hue = Math.random();                         // 0..1
    var sat = 0.45 + Math.random() * 0.20;           // 0.45..0.65
    var lit = 0.78 + Math.random() * 0.10;           // 0.78..0.88
    var rgb = hslToRgbObj(hue, sat, lit);
    map[id] = 'rgb(' +
      Math.round(rgb.red   * 255) + ',' +
      Math.round(rgb.green * 255) + ',' +
      Math.round(rgb.blue  * 255) + ')';
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
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { red: Math.round(r * 1000) / 1000,
           green: Math.round(g * 1000) / 1000,
           blue: Math.round(b * 1000) / 1000 };
}

/**
 * Color one row in a sheet based on the Program ID in a given column.
 * colIndex: 1-based column number that holds the Program ID.
 */
function colorRowByProgramId(sheet, rowIndex, colIndex) {
  var id = String(sheet.getRange(rowIndex, colIndex).getValue() || '').trim();
  if (!id) return;
  var color = getOrCreateIdColor(id);
  var numCols = sheet.getLastColumn() || 1;
  sheet.getRange(rowIndex, 1, 1, numCols).setBackground(color);
}

/**
 * Recolor all data rows in Sessions (Program ID = col A) and
 * Bookings (Program ID = col E). Run once from the menu after adding rows
 * that were entered before this script was in place.
 */
function recolorAllRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Programs — col A (1)
  var programs = ss.getSheetByName('Programs');
  if (programs) {
    var lastRow = programs.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      colorRowByProgramId(programs, r, 1);
    }
  }

  // Sessions — col A (1)
  var sessions = ss.getSheetByName('Sessions');
  if (sessions) {
    var lastRow = sessions.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      colorRowByProgramId(sessions, r, 1);
    }
  }

  // Bookings — col E (5)
  var bookings = ss.getSheetByName('Bookings');
  if (bookings) {
    var lastRow = bookings.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      colorRowByProgramId(bookings, r, 5);
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'All rows recolored by Program ID!', 'InneREvolution', 4);
  Logger.log('[RECOLOR] Done');
}

function createStripePaymentLink(programName, priceInCents) {
  var cfg = getConfig();
  if (!cfg.STRIPE_KEY || priceInCents <= 0) return '';
  try {
    var priceResp = UrlFetchApp.fetch('https://api.stripe.com/v1/prices', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
      payload: { unit_amount: String(priceInCents), currency: 'eur', 'product_data[name]': programName },
      muteHttpExceptions: true
    });
    var priceData = JSON.parse(priceResp.getContentText());
    if (!priceData.id) { Logger.log('[STRIPE ERR] ' + priceResp.getContentText()); return ''; }

    var linkResp = UrlFetchApp.fetch('https://api.stripe.com/v1/payment_links', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + cfg.STRIPE_KEY },
      payload: { 'line_items[0][price]': priceData.id, 'line_items[0][quantity]': '1' },
      muteHttpExceptions: true
    });
    var linkData = JSON.parse(linkResp.getContentText());
    return linkData.url || '';
  } catch(e) {
    Logger.log('[STRIPE ERR] ' + e.message);
    return '';
  }
}

/** Run from menu to create Stripe links for all Programs rows missing one. */
function createAllStripeLinks() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var prog = ss.getSheetByName('Programs');
  var ui   = SpreadsheetApp.getUi();
  var rows = prog.getDataRange().getValues();
  var created = 0;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[0] || !row[1] || !row[2] || row[8]) continue;
    var price = parseFloat(String(row[2]).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!price) continue;
    var link = createStripePaymentLink(row[1], Math.round(price * 100));
    if (link) { prog.getRange(r + 1, 9).setValue(link); Utilities.sleep(300); created++; }
  }
  ui.alert('InneREvolution', 'Stripe links created: ' + created, ui.ButtonSet.OK);
}

// ─── 5. FORMAT SHEET ─────────────────────────────────────────────────────────
function formatSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var TABS = {
    'Programs'      : { hdr: '#371964', alt: '#F2EDFF', nc: 14 },
    'Sessions'      : { hdr: '#123062', alt: '#E9F0FF', nc:  7 },
    'Discount Codes': { hdr: '#0A5A41', alt: '#E4F8EF', nc:  3 },
    'Bookings'      : { hdr: '#5F1630', alt: '#FFEAF1', nc: 19 },
  };
  var COL_WIDTHS = {
    'Programs'      : [105, 205, 85, 95, 95, 72, 112, 112, 265, 285, 155, 105, 135, 105],
    'Sessions'      : [105, 82, 112, 92, 92, 265, 225],
    'Discount Codes': [155, 115, 325],
    'Bookings'      : [158, 152, 208, 122, 105, 188, 158, 132, 132, 122, 108, 118, 78, 138, 108, 215, 128, 155, 132],
  };
  for (var tabName in TABS) {
    var cfg   = TABS[tabName];
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) continue;
    sheet.setTabColor(cfg.hdr);
    sheet.setFrozenRows(1);
    sheet.getBandings().forEach(function(b) { try { b.remove(); } catch(ex) {} });
    sheet.setConditionalFormatRules([]);
    var maxR = sheet.getMaxRows();
    var bd = sheet.getRange(1, 1, maxR, cfg.nc).applyRowBanding();
    bd.setHeaderRowColor(cfg.hdr); bd.setFirstRowColor('#ffffff'); bd.setSecondRowColor(cfg.alt);
    sheet.getRange(1, 1, 1, cfg.nc)
      .setBackground(cfg.hdr).setFontColor('#ffffff')
      .setFontWeight('bold').setFontFamily('Arial').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(1, 44);
    var dataRows = Math.min(maxR - 1, 200);
    if (dataRows > 0) sheet.setRowHeights(2, dataRows, 26);
    if (COL_WIDTHS[tabName]) {
      var widths = COL_WIDTHS[tabName];
      for (var ci = 0; ci < widths.length; ci++) sheet.setColumnWidth(ci + 1, widths[ci]);
    }
  }
  var dash = ss.getSheetByName('Dashboard');
  if (dash) dash.setTabColor('#161737');
  applyConditionalFormatting(ss);
  applyDataValidations(ss);
  ui.alert('InneREvolution', 'All tabs formatted successfully!', ui.ButtonSet.OK);
}

// ─── 6. CONDITIONAL FORMATTING ───────────────────────────────────────────────
function applyConditionalFormatting(ss) {
  var prog = ss.getSheetByName('Programs');
  var book = ss.getSheetByName('Bookings');
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
  var pMax = Math.max(prog.getMaxRows() - 1, 1);
  var bMax = Math.max(book.getMaxRows() - 1, 1);
  var progRules = [];
  progRules.push(cfText(prog.getRange(2, 6, pMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(2, 6, pMax, 1), 'NO',  '#DCDCDC', '#5A5A5A'));
  progRules.push(cfNum(prog.getRange(2, 5, pMax, 1),  'eq',  0, 0, '#F2BBBB', '#8C1919'));
  progRules.push(cfNum(prog.getRange(2, 5, pMax, 1),  'bet', 1, 3, '#FFDAB4', '#A05000'));
  progRules.push(cfNum(prog.getRange(2, 5, pMax, 1),  'gt',  3, 0, '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(2, 14, pMax, 1), 'Online',    '#B9D7F5', '#0F4182'));
  progRules.push(cfText(prog.getRange(2, 14, pMax, 1), 'In-Person', '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(2, 14, pMax, 1), 'In-person', '#B7E1CD', '#0C552D'));
  progRules.push(cfText(prog.getRange(2, 14, pMax, 1), 'Hybrid',    '#FFF3B4', '#826400'));
  prog.setConditionalFormatRules(progRules);
  var bookRules = [];
  bookRules.push(cfText(book.getRange(2, 13, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 13, bMax, 1), 'NO',  '#F2BBBB', '#8C1919'));
  bookRules.push(cfText(book.getRange(2, 12, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 12, bMax, 1), 'NO',  '#FFF3B4', '#826400'));
  bookRules.push(cfText(book.getRange(2, 14, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 14, bMax, 1), 'NO',  '#FFF3B4', '#826400'));
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'YES',     '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'PARTIAL', '#FFDAB4', '#A05000'));
  bookRules.push(cfText(book.getRange(2, 17, bMax, 1), 'NO',      '#F2BBBB', '#8C1919'));
  bookRules.push(cfText(book.getRange(2, 19, bMax, 1), 'YES', '#B7E1CD', '#0C552D'));
  bookRules.push(cfText(book.getRange(2, 19, bMax, 1), 'NO',  '#DCDCDC', '#5A5A5A'));
  book.setConditionalFormatRules(bookRules);
}

// ─── 7. DATA VALIDATIONS ─────────────────────────────────────────────────────
function applyDataValidations(ss) {
  var prog = ss.getSheetByName('Programs');
  var book = ss.getSheetByName('Bookings');
  var n    = 998;
  function dv(vals, strict) {
    return SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(!strict).build();
  }
  prog.getRange(2, 6,  n, 1).setDataValidation(dv(['YES', 'NO'], true));
  prog.getRange(2, 12, n, 1).setDataValidation(dv(['English', 'Deutsch', 'English / Deutsch'], false));
  prog.getRange(2, 14, n, 1).setDataValidation(dv(['Online', 'In-Person', 'Hybrid'], false));
  book.getRange(2, 12, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  book.getRange(2, 13, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  book.getRange(2, 14, n, 1).setDataValidation(dv(['YES', 'NO'], false));
  book.getRange(2, 17, n, 1).setDataValidation(dv(['YES', 'PARTIAL', 'NO'], false));
  book.getRange(2, 19, n, 1).setDataValidation(dv(['YES', 'NO'], false));
}

// ─── 8. DASHBOARD ────────────────────────────────────────────────────────────
function buildDashboard() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName('Dashboard');
  var ui   = SpreadsheetApp.getUi();
  if (!dash) { ui.alert('Dashboard tab not found.'); return; }
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
  var kpis = [
    { c: 2,  label: 'TOTAL BOOKINGS',    formula: '=COUNTA(Bookings!B2:B)',                                             color: '#371964' },
    { c: 4,  label: 'CONFIRMED PAID',    formula: '=COUNTIF(Bookings!M2:M;"YES")',                                      color: '#0A5A41' },
    { c: 6,  label: 'AWAITING PAYMENT',  formula: '=COUNTIF(Bookings!M2:M;"NO")',                                       color: '#5F1630' },
    { c: 8,  label: 'ACTIVE PROGRAMS',   formula: '=COUNTIF(Programs!F2:F;"YES")',                                      color: '#123062' },
    { c: 10, label: 'REVENUE COLLECTED', formula: '=TEXT(SUMIF(Bookings!M2:M;"YES";Bookings!K2:K);"EUR #.##0,00")',     color: '#5C3A00' },
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
  var phCols = ['Program Name', 'Spots Total', 'Spots Left', 'Bookings', 'Revenue', 'Active', 'Format', 'Language', 'Start Date'];
  phCols.forEach(function(h, i) { cell(8, 2 + i, h, '#5C3D99', '#ffffff', 9, true, 'center', 1); });
  for (var pi = 0; pi < 12; pi++) {
    var pr = 9 + pi; dash.setRowHeight(pr, 25);
    var sr = pi + 2;
    var bg = pi % 2 === 0 ? '#F2EDFF' : '#ffffff';
    var pf = [
      '=IF(Programs!A'+sr+'<>"",Programs!B'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",Programs!D'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",Programs!E'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",COUNTIF(Bookings!E:E;Programs!A'+sr+'),"")',
      '=IF(Programs!A'+sr+'<>"",TEXT(SUMIF(Bookings!E:E;Programs!A'+sr+';Bookings!K:K);"EUR #.##0,00"),"")',
      '=IF(Programs!A'+sr+'<>"",Programs!F'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",Programs!N'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",Programs!L'+sr+',"")',
      '=IF(Programs!A'+sr+'<>"",TEXT(Programs!G'+sr+',"dd mmm yyyy"),"")',
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
  var refs = [
    ['Bookings with friends invited',  '=COUNTIF(Bookings!O2:O;">0")'],
    ['Total friend spots promised',    '=SUMIF(Bookings!O2:O;">0";Bookings!O2:O)'],
    ['Friends verified as joined',     '=COUNTIF(Bookings!Q2:Q;"YES")'],
    ['Friends partially verified',     '=COUNTIF(Bookings!Q2:Q;"PARTIAL")'],
    ['Bookings listing a referrer',    '=COUNTIFS(Bookings!R2:R;"<>")'],
    ['Referrers confirmed in system',  '=COUNTIF(Bookings!S2:S;"YES")'],
  ];
  var actions = [
    ['Unpaid bookings',                 '=COUNTIF(Bookings!M2:M;"NO")'],
    ['Intake forms not yet sent',       '=COUNTIF(Bookings!N2:N;"NO")'],
    ['Programs fully booked (0 spots)', '=COUNTIF(Programs!E2:E;0)'],
    ['Programs with 1-3 spots left',    '=COUNTIFS(Programs!E2:E;"<=3";Programs!E2:E;">0")'],
    ['Friend referrals unverified',     '=COUNTIF(Bookings!Q2:Q;"NO")'],
    ['Referrers unconfirmed',           '=COUNTIF(Bookings!S2:S;"NO")'],
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
  cell(32, 9, 'InneREvolution Booking System', null, '#aaaaaa', 9, false, 'right', 3);
  ui.alert('InneREvolution', 'Dashboard rebuilt!', ui.ButtonSet.OK);
}

// ─── 9. FRIEND REFERRAL CHECK ────────────────────────────────────────────────
/**
 * Checks Friends Invited (col P) and Referrer Name (col R) against all booked
 * names in col B. Updates Q (Friends Verified) and S (Referrer Verified) automatically.
 * Runs daily at 09:00 via setupTriggers() — no manual action needed.
 */
function checkFriendReferrals() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var book = ss.getSheetByName('Bookings');
  var data = book.getDataRange().getValues();
  var ui   = SpreadsheetApp.getUi();
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
      if (String(row[16]) !== newQ) { book.getRange(i + 1, 17).setValue(newQ); updates++; }
    }
    var referrer = String(row[17] || '').toLowerCase().trim();
    if (referrer) {
      var newS = booked[referrer] ? 'YES' : 'NO';
      if (String(row[18]) !== newS) { book.getRange(i + 1, 19).setValue(newS); updates++; }
    }
  }
  Logger.log('[REFERRALS] ' + updates + ' updates applied');
  ui.alert('InneREvolution', 'Referral check complete.\n' + updates + ' cell(s) updated.', ui.ButtonSet.OK);
}

// ─── 10. PAYMENT REMINDERS ───────────────────────────────────────────────────
function sendPaymentReminders() {
  var cfg  = getConfig();
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var book = ss.getSheetByName('Bookings');
  var prog = ss.getSheetByName('Programs');
  var ui   = SpreadsheetApp.getUi();
  var stripeLinks = {};
  prog.getDataRange().getValues().forEach(function(r, i) {
    if (i > 0 && r[0]) stripeLinks[String(r[0]).trim()] = r[8] || '';
  });
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 2);
  var rows = book.getDataRange().getValues();
  var sent = 0;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[1] || String(row[12]).toUpperCase() !== 'NO') continue;
    if (!row[0] || new Date(row[0]) >= cutoff) continue;
    var name = row[1], email = row[2], pid = String(row[4]);
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
  ui.alert('InneREvolution', 'Payment reminders sent: ' + sent, ui.ButtonSet.OK);
}

// ─── 11. DAILY REPORT ────────────────────────────────────────────────────────
function sendDailyReport() {
  var cfg = getConfig();
  var ui  = SpreadsheetApp.getUi();
  if (!cfg.INSTRUCTOR_EMAIL) { ui.alert('Set INSTRUCTOR_EMAIL in Script Properties first.'); return; }
  var ss   = SpreadsheetApp.openById(cfg.SHEET_ID);
  var book = ss.getSheetByName('Bookings');
  var prog = ss.getSheetByName('Programs');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var rows  = book.getDataRange().getValues();
  var newToday = [], unpaid = [], totalRev = 0, paidCount = 0;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[1]) continue;
    var paid = String(row[12]).toUpperCase();
    if (row[0]) { var d = new Date(row[0]); d.setHours(0,0,0,0); if (d.getTime() === today.getTime()) newToday.push(row); }
    if (paid === 'NO')  unpaid.push(row);
    if (paid === 'YES') { paidCount++; totalRev += parseFloat(row[10]) || 0; }
  }
  var activeProgs = prog.getDataRange().getValues()
    .filter(function(r, i) { return i > 0 && String(r[5]).toUpperCase() === 'YES'; }).length;
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
  html += '<p style="margin-top:32px;color:#aaa;font-size:11px;text-align:center">InneREvolution Yoga — Automated Daily Report</p></div></div>';
  GmailApp.sendEmail(cfg.INSTRUCTOR_EMAIL,
    'InneREvolution Daily Report — ' + today.toDateString(),
    paidCount + ' paid | EUR ' + totalRev.toFixed(2) + ' revenue | ' + unpaid.length + ' unpaid',
    { htmlBody: html });
  Logger.log('[REPORT] Sent to ' + cfg.INSTRUCTOR_EMAIL);
  ui.alert('InneREvolution', 'Daily report sent to ' + cfg.INSTRUCTOR_EMAIL, ui.ButtonSet.OK);
}

// ─── 12. TRIGGER SETUP ───────────────────────────────────────────────────────
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDailyReport'       ).timeBased().atHour(8 ).everyDays(1).create();
  ScriptApp.newTrigger('checkFriendReferrals'  ).timeBased().atHour(9 ).everyDays(1).create();
  ScriptApp.newTrigger('sendPaymentReminders'  ).timeBased().atHour(10).everyDays(1).create();
  ScriptApp.newTrigger('syncSessionsToCalendar').timeBased().atHour(0 ).everyDays(1).create();
  Logger.log('[TRIGGERS] 4 triggers installed');
  SpreadsheetApp.getUi().alert('InneREvolution',
    'Automation triggers installed:\n\n'
    + '  08:00  Daily instructor report\n'
    + '  09:00  Friend referral check (auto-updates col Q + S)\n'
    + '  10:00  Payment reminders\n'
    + '  00:00  Calendar sync\n\n'
    + 'All run daily automatically.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// ─── 13. AUTHORIZE & TEST ─────────────────────────────────────────────────────
function authorizeAndTest() {
  var cfg = getConfig();
  var ui  = SpreadsheetApp.getUi();
  var ok = [], errors = [];
  try { var n = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bookings').getLastRow(); ok.push('[OK] Sheets: ' + n + ' rows in Bookings'); }
  catch(e) { errors.push('[FAIL] Sheets: ' + e.message); }
  try { GmailApp.getInboxUnreadCount(); ok.push('[OK] Gmail: authorized'); }
  catch(e) { errors.push('[FAIL] Gmail: ' + e.message); }
  if (cfg.CALENDAR_ID) {
    try { CalendarApp.getCalendarById(cfg.CALENDAR_ID); ok.push('[OK] Calendar: authorized'); }
    catch(e) { errors.push('[FAIL] Calendar: ' + e.message); }
  } else { ok.push('[--] Calendar: CALENDAR_ID not set (optional)'); }
  ok.push(cfg.STRIPE_KEY ? '[OK] Stripe key: set' : '[--] Stripe key: not set — add STRIPE_KEY to Script Properties');
  ui.alert('Authorization Test', ok.join('\n') + (errors.length ? '\n\n' + errors.join('\n') : ''), ui.ButtonSet.OK);
}

// ─── 14. CALENDAR SYNC ───────────────────────────────────────────────────────
function syncSessionsToCalendar() {
  var cfg = getConfig();
  var ui  = SpreadsheetApp.getUi();
  if (!cfg.CALENDAR_ID) { ui.alert('InneREvolution', 'CALENDAR_ID not set in Script Properties.', ui.ButtonSet.OK); return; }
  var ss      = SpreadsheetApp.openById(cfg.SHEET_ID);
  var sesSh   = ss.getSheetByName('Sessions');
  var progSh  = ss.getSheetByName('Programs');
  var sesData = sesSh.getDataRange().getValues();
  var cal     = CalendarApp.getCalendarById(cfg.CALENDAR_ID);
  if (!cal) { ui.alert('Calendar not found — check CALENDAR_ID.'); return; }
  var progMap = {};
  progSh.getDataRange().getValues().forEach(function(r, i) {
    if (i > 0 && r[0]) progMap[String(r[0]).trim()] = r[1] || r[0];
  });
  var created = 0, updated = 0, skipped = 0;
  for (var r = 1; r < sesData.length; r++) {
    var row = sesData[r];
    var pid = String(row[0] || '').trim();
    var sesNum = row[1], dateRaw = row[2], tStart = row[3], tEnd = row[4];
    var notes = row[5] || '', evId = String(row[6] || '').trim();
    if (!pid || !dateRaw) { skipped++; continue; }
    var sessionDate = parseSheetDate(dateRaw);
    if (!sessionDate) { skipped++; continue; }
    var startDt = buildDateTime(sessionDate, tStart);
    var endDt   = buildDateTime(sessionDate, tEnd || tStart);
    if (!startDt) { skipped++; continue; }
    var progName = progMap[pid] || pid;
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
          sesSh.getRange(r + 1, 7).setValue(ne.getId()); created++;
        }
      } else {
        var ne2 = cal.createEvent(title, startDt, endDt, { description: desc });
        sesSh.getRange(r + 1, 7).setValue(ne2.getId()); created++;
      }
    } catch(e) { Logger.log('[CALENDAR ERROR] row ' + (r+1) + ': ' + e.message); skipped++; }
  }
  Logger.log('[CALENDAR] created=' + created + ' updated=' + updated + ' skipped=' + skipped);
  ui.alert('InneREvolution',
    'Calendar sync complete:\nCreated: ' + created + '\nUpdated: ' + updated + '\nSkipped: ' + skipped,
    ui.ButtonSet.OK);
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
  } else if (typeof timeVal === 'string' && timeVal.indexOf(':') >= 0) {
    var p = timeVal.split(':');
    mins = parseInt(p[0]) * 60 + parseInt(p[1] || 0);
  } else { return d; }
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/**
 * ONE-TIME MIGRATION: replace any 'German' / 'GERMAN' language values
 * in the Programs sheet with 'Deutsch'.
 * Run once manually from the Apps Script editor after deploying.
 */
function fixLanguageValues() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var prog = ss.getSheetByName('Programs');
  if (!prog) { Logger.log('Programs sheet not found'); return; }
  var lastRow = prog.getLastRow();
  if (lastRow < 2) { Logger.log('No data rows'); return; }
  // Language is column 12 (index 11, column L)
  var range  = prog.getRange(2, 12, lastRow - 1, 1);
  var values = range.getValues();
  var count  = 0;
  for (var i = 0; i < values.length; i++) {
    var v = String(values[i][0]).trim();
    if (v.toUpperCase() === 'GERMAN') {
      values[i][0] = 'Deutsch';
      count++;
    } else if (v.toLowerCase() === 'english / german' || v.toUpperCase() === 'ENGLISH / GERMAN') {
      values[i][0] = 'English / Deutsch';
      count++;
    }
  }
  range.setValues(values);
  // Re-apply data validations to update dropdown
  applyDataValidations(ss);
  Logger.log('fixLanguageValues: updated ' + count + ' cell(s).');
  SpreadsheetApp.getUi().alert('Done! Updated ' + count + ' language cell(s) to Deutsch.');
}
