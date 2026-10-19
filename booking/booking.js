// booking/booking.js
// Booking page logic — fetches programs from Google Sheets, handles registration modal.
// Depends on CONFIG from config.js (gitignored locally, injected at deploy time).

'use strict';

// ─── Booking i18n ─────────────────────────────────────────────────────────────
var BOOKING_STRINGS = {
  en: {
    toSite:             '\u2190 Home',
    footerReturn:       'Return to website',
    sessionsLabel:     function (n) { return n + (n === 1 ? ' session' : ' sessions'); },
    hrsLabel:          ' hrs',
    titleTag:          'Yoga Programs — InneREvolution Yoga',
    heroTitle:          'Yoga Programs',
    heroTagline:        'Classical Hatha Yoga \u2014 Begin your journey',
    loading:            'Loading programs\u2026',
    reserveNote:        'Register to reserve your spot \u2014 payment details will follow by email',
    noPrograms:         'No programs are currently available.',
    checkBack:          'Check back soon or ',
    returnSiteLink:     'return to the site',
    soldOutSpots:       'Sold out',
    spotsLeft:          function(n) { return n + ' spot' + (n === 1 ? '' : 's') + ' left'; },
    fullBadge:          'Full',
    soldOutBtn:         'Sold Out',
    registerBtn:        'Register',
    modalTitle:         'Register',
    freeLabel:          'Free',
    labelName:          'Full Name',
    labelEmail:         'Email',
    labelPhone:         'Phone',
    discountToggle:     'Have a discount code?',
    labelDiscount:      'Discount Code',
    labelTotal:         'Total',
    friendsQuestion:    'Are you bringing friends?',
    friendsHint:        '(10% off per friend joining)',
    radioNo:            'No',
    radioYes:           'Yes',
    labelFriendCount:   'How many friends are joining with you?',
    labelFriendNames:   'Friends\u2019 names',
    friendsPlaceholder: 'One name per line (so we can match their registration)',
    labelComments:      'Comments / Questions',
    commentsPlaceholder:'Anything you\u2019d like us to know\u2026',
    submitBtn:          'Request Spot \u0026 Pay',
    successTitle:       'You\u2019re Registered!',
    successDefault:     'Check your email for the payment link and confirmation details.',
    returnSiteBtn:      '\u2190 Return to site',
    pctOff:             function(d, p) { return d + ' (' + p + '% off)'; },
    friendsJoining:     function(n, p) { return n + ' friend' + (n > 1 ? 's' : '') + ' joining (' + p + '% off)'; },
    youSave:            function(a) { return ' \u2014 you save \u20ac' + a; },
    codeInvalid:        'Code not recognised.',
    friendsHintText:    function(n, p) { return '\u2714 ' + n + ' friend' + (n > 1 ? 's' : '') + ' joining \u2192 ' + p + '% friends discount auto-applied!'; },
    alertNoConfig:      'Booking system is not configured yet (missing Apps Script URL). Please contact us directly to register.',
    alertFillIn:        'Please fill in your name and email.',
    alertError:         'Booking error: ',
    alertConsole:       '\n\nOpen F12 console for full details.',
    successPayLink:     function(e) { return 'Check your inbox at ' + e + ' \u2014 a secure payment link is on its way to confirm your spot.'; },
    successFallback:    function(e) { return 'Check your inbox at ' + e + ' for your payment link and confirmation.'; },
    successSpamTip:     'If nothing arrives within 2 minutes, please check your spam folder.',
    successContactFallback: function(mail) { return 'Still nothing? Email us directly at ' + mail + '.'; },
    payNowBtn: 'Pay now & confirm your spot',
    successManual: function (email) { return 'Your spot is reserved! ✉️ I will email you the payment details (' + email + ') within 24 hours — your place is already secured.'; },
    alertTimeout:       'The request is taking longer than expected. Your booking may still go through \u2014 please check your email in a few minutes before retrying.',
    alertNetwork:       'We couldn\u2019t reach the booking server. Please check your internet connection and try again.',
    alertInvalidEmail:  'Please enter a valid email address (e.g. name@example.com).',
    dateLocale:         'en-GB',
  },
  de: {
    toSite:             '\u2190 Home',
    footerReturn:       'Zur Website zurück',
    sessionsLabel:     function (n) { return n + (n === 1 ? ' Termin' : ' Termine'); },
    hrsLabel:          ' Std.',
    titleTag:          'Yoga Programme — InneREvolution Yoga',
    heroTitle:          'Yoga Programme',
    heroTagline:        'Klassisches Hatha Yoga \u2014 Beginne deine Reise',
    loading:            'Lade Programme\u2026',
    reserveNote:        'Melde dich an, um deinen Platz zu reservieren \u2014 Zahlungsdetails folgen per E-Mail',
    noPrograms:         'Derzeit sind keine Programme verf\u00fcgbar.',
    checkBack:          'Schau bald wieder vorbei oder ',
    returnSiteLink:     'kehre zur Website zur\u00fcck',
    soldOutSpots:       'Ausverkauft',
    spotsLeft:          function(n) { return n + ' Platz' + (n === 1 ? '' : '\u00e4tze') + ' verf\u00fcgbar'; },
    fullBadge:          'Voll',
    soldOutBtn:         'Ausverkauft',
    registerBtn:        'Anmelden',
    modalTitle:         'Anmelden',
    freeLabel:          'Kostenlos',
    labelName:          'Vollst\u00e4ndiger Name',
    labelEmail:         'E-Mail',
    labelPhone:         'Telefon',
    discountToggle:     'Hast du einen Rabattcode?',
    labelDiscount:      'Rabattcode',
    labelTotal:         'Gesamt',
    friendsQuestion:    'Bringst du Freunde mit?',
    friendsHint:        '(10% Rabatt pro mitgebrachtem Freund)',
    radioNo:            'Nein',
    radioYes:           'Ja',
    labelFriendCount:   'Wie viele Freunde machen mit?',
    labelFriendNames:   'Namen der Freunde',
    friendsPlaceholder: 'Ein Name pro Zeile (damit wir die Anmeldungen zuordnen k\u00f6nnen)',
    labelComments:      'Kommentare / Fragen',
    commentsPlaceholder:'Was sollen wir wissen\u2026',
    submitBtn:          'Platz reservieren \u0026 bezahlen',
    successTitle:       'Du bist angemeldet!',
    successDefault:     'Pr\u00fcfe deine E-Mails f\u00fcr den Zahlungslink und die Best\u00e4tigungsdetails.',
    returnSiteBtn:      '\u2190 Zur\u00fcck zur Website',
    pctOff:             function(d, p) { return d + ' (' + p + '% Rabatt)'; },
    friendsJoining:     function(n, p) { return n + ' Freund' + (n > 1 ? 'e' : '') + ' dabei (' + p + '% Rabatt)'; },
    youSave:            function(a) { return ' \u2014 du sparst \u20ac' + a; },
    codeInvalid:        'Code nicht erkannt.',
    friendsHintText:    function(n, p) { return '\u2714 ' + n + ' Freund' + (n > 1 ? 'e' : '') + ' dabei \u2192 ' + p + '% Freundesrabatt automatisch angewandt!'; },
    alertNoConfig:      'Das Buchungssystem ist noch nicht konfiguriert. Bitte kontaktiere uns direkt zur Anmeldung.',
    alertFillIn:        'Bitte gib deinen Namen und deine E-Mail-Adresse ein.',
    alertError:         'Buchungsfehler: ',
    alertConsole:       '\n\n\u00d6ffne die F12-Konsole f\u00fcr Details.',
    successPayLink:     function(e) { return 'Schau in dein Postfach (' + e + ') \u2014 ein sicherer Zahlungslink ist unterwegs, um deinen Platz zu best\u00e4tigen.'; },
    successFallback:    function(e) { return 'Schau in dein Postfach (' + e + ') f\u00fcr deinen Zahlungslink und deine Best\u00e4tigung.'; },
    successSpamTip:     'Falls innerhalb von 2 Minuten nichts ankommt, schau bitte auch im Spam-Ordner nach.',
    successContactFallback: function(mail) { return 'Immer noch nichts? Schreib uns direkt an ' + mail + '.'; },
    payNowBtn: 'Jetzt zahlen & Platz sichern',
    successManual: function (email) { return 'Dein Platz ist reserviert! ✉️ Ich schicke dir die Zahlungsdetails (' + email + ') innerhalb von 24 Stunden per E-Mail — dein Platz ist bereits gesichert.'; },
    alertTimeout:       'Die Anfrage dauert l\u00e4nger als gewohnt. Deine Buchung k\u00f6nnte trotzdem durchgehen \u2014 bitte pr\u00fcfe in ein paar Minuten dein Postfach, bevor du es erneut versuchst.',
    alertNetwork:       'Der Buchungsserver ist gerade nicht erreichbar. Bitte pr\u00fcfe deine Internetverbindung und versuche es erneut.',
    alertInvalidEmail:  'Bitte gib eine g\u00fcltige E-Mail-Adresse ein (z.\u202fB. name@beispiel.com).',
    dateLocale:         'de-AT',
  }
};

/* Detect language: ?lang= URL param → localStorage key 'innerevolution_lang' → default EN */
(function () {
  var params = new URLSearchParams(window.location.search);
  var urlLang = params.get('lang');
  if (urlLang === 'de' || urlLang === 'en') localStorage.setItem('innerevolution_lang', urlLang);
  var stored = localStorage.getItem('innerevolution_lang');
  window._bookingLang = (stored === 'de') ? 'de' : 'en';
})();

/* Shorthand getter — bs('key') returns string or function */
function bs(key) { return BOOKING_STRINGS[window._bookingLang || 'en'][key]; }
// ─── End Booking i18n ─────────────────────────────────────────────────────────

// ─── State ────────────────────────────────────────────────────────────────────
let programs       = [];
let sessions       = [];
let discountCodes  = [];
let activeDiscount = { pct: 0, code: '', description: '' };
let friendsDiscount = { pct: 0, count: 0 }; // auto-discount: 10% × friends count

// ─── Sheets API helper ────────────────────────────────────────────────────────
// Resolved backend URL — CI-generated config.js may lack APPS_SCRIPT_URL until the
// deploy.yml update is pushed; NEWSLETTER_URL points to the same backend, and the
// live /exec deployment is the last-resort constant.
const BOOKING_BACKEND_URL = (typeof CONFIG !== 'undefined') ?
  (CONFIG.APPS_SCRIPT_URL || CONFIG.NEWSLETTER_URL ||
   'https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec') : '';

async function fetchSheet(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.SHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error ${res.status} for range: ${range}`);
  const data = await res.json();
  return data.values || [];
}

// ─── Serial number converters (Google Sheets stores dates/times as numbers) ───
function serialToISO(serial) {
  if (!serial && serial !== 0) return '';
  if (typeof serial === 'string' && serial.includes('-')) return serial; // already ISO
  // Google Sheets epoch: Dec 30, 1899
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000)); // convert to Unix ms
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function serialToTime(frac) {
  if (!frac && frac !== 0) return '';
  if (typeof frac === 'string') return frac.substring(0, 5); // already "HH:MM"
  const totalMins = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}


// ─── Data fetchers ────────────────────────────────────────────────────────────
async function fetchPrograms() {
  // Website display sheet: A=ProgramID, B=Name, C=Price, D=SpotsTotal, E=SpotsLeft,
  //   F=Active, G=StartDate, H=Sessions, I=Std/Sess, J=TotalHours,
  //   K=Description, L=Location, M=Language
  // Row 1=title, Row 2=header(emoji), Row 3+=data
  const rows = await fetchSheet('Programs!A3:O');  // A–M = program data, N = formUrl, O = packageSpec
  programs = rows.map(r => ({
    id:               (r[0] || '').toString().trim(),
    name:             r[1] || '',
    price:            parseFloat(r[2]) || 0,
    spotsTotal:       r[3] !== '' && r[3] !== undefined && r[3] !== null ? parseInt(r[3]) : null,
    spotsLeft:        r[4] !== '' && r[4] !== undefined && r[4] !== null ? parseInt(r[4]) : null,
    active:           ['TRUE','YES','1'].includes((r[5] || '').toString().toUpperCase().trim()),
    startDate:        serialToISO(r[6] || ''),
    endDate:          '',
    sessionCount:     parseInt(r[7]) || 0,
    hoursPerSession:  parseFloat(r[8]) || 0,
    totalHours:       parseFloat(r[9]) || 0,
    stripePaymentLink: '',
    description:      r[10] || '',
    location:         r[11] || '',
    language:         r[12] || '',
    formUrl:          r[13] || '',   // Column N — external registration form URL
    packageSpec:      r[14] || '',   // Column O — sheet-driven packages spec (native modal)
    image:            '',
    format:           '',
  }));
}

async function fetchSessions() {
  // Website display sheet: A=ProgramID, B=ProgramName, C=SessionNum,
  //                       D=Date, E=TimeStart, F=TimeEnd
  const rows = await fetchSheet('Sessions!A2:F');
  sessions = rows.map(r => ({
    programId:  (r[0] || '').toString().trim(),
    sessionNum: parseInt(r[2]) || 0,  // col C (skip B=ProgramName)
    date:       serialToISO(r[3] || ''),
    timeStart:  serialToTime(r[4] || ''),
    timeEnd:    serialToTime(r[5] || ''),
    notes:      '',
  }));
}

async function fetchDiscountCodes() {
  // Columns: A=Code, B=DiscountPct, C=Description
  const rows = await fetchSheet(`'Discount Codes'!A2:C`);
  discountCodes = rows.map(r => ({
    code:        (r[0] || '').toUpperCase().trim(),
    pct:         parseFloat(r[1]) || 0,
    description: r[2] || '',
  }));
}

// ─── Date/time formatting ─────────────────────────────────────────────────────
function formatDate(raw) {
  // CSP-safe: avoids toLocaleDateString() which triggers eval-like Intl locale
  // loading in Chromium-based browsers with strict script-src CSP.
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
  if (isNaN(d.getTime())) return raw;
  const lang = window._bookingLang || 'en';
  var weekdays = lang === 'de'
    ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = lang === 'de'
    ? ['Jan', 'Feb', 'M\u00e4r', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return weekdays[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + ' ' + months[d.getMonth()];
}

function formatTime(raw) {
  // Input: "18:00" or "18:00:00" — output: "18:00" (24h)
  if (!raw) return '';
  return raw.substring(0, 5);
}

// ─── Render programs ──────────────────────────────────────────────────────────
function renderPrograms() {
  const grid    = document.getElementById('programs-grid');
  const loading = document.getElementById('programs-loading');
  const empty   = document.getElementById('programs-empty');

  loading.style.display = 'none';

  // Auto-expire: hide programs whose last date is before today.
  // Programs without any date are kept (cannot be judged).
  const _now = new Date();
  const todayISO = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const lastDates = {};
  sessions.forEach(s => {
    if (s.programId && s.date) {
      if (!lastDates[s.programId] || s.date > lastDates[s.programId]) lastDates[s.programId] = s.date;
    }
  });
  const active = programs.filter(p => {
    if (!p.active) return false;
    const lastDate = lastDates[p.id] || p.startDate;
    return !lastDate || lastDate >= todayISO;
  });
  if (active.length === 0) {
    empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  grid.innerHTML = active.map(p => buildCard(p)).join('');
}

function buildCard(p) {
  const isFull       = p.spotsLeft !== null && p.spotsLeft <= 0;
  const cardSessions = sessions.filter(s => s.programId === p.id);

  const spotsHtml = p.spotsLeft === null
    ? ''
    : isFull
    ? `<span class="spots-full">${bs('soldOutSpots')}</span>`
    : `<span class="spots-available">${bs('spotsLeft')(p.spotsLeft)}</span>`;

  const badgeHtml = isFull ? `<span class="badge-full">${bs('fullBadge')}</span>` : '';

  const dateRange = p.startDate
    ? `${formatDate(p.startDate)}${p.endDate && p.endDate !== p.startDate ? ' &ndash; ' + formatDate(p.endDate) : ''}`
    : '';

  const descHtml = p.description
    ? `<p class="program-card-description">${p.description.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}</p>`
    : '';

  const infoHtml = [
    p.sessionCount ? bs('sessionsLabel')(p.sessionCount) : '',
    p.totalHours   ? `${p.totalHours}${bs('hrsLabel')}` : ''
  ].filter(Boolean).map(v => `<span class="program-card-badge program-card-info">${v}</span>`).join('');

  const metaHtml = [p.format, p.language, p.location].filter(Boolean)
    .map(v => `<span class="program-card-badge">${v}</span>`).join('');

  // Group sessions by date for compact display
  const sessionsByDate = {};
  cardSessions.forEach(s => {
    const dateKey = formatDate(s.date);
    if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = [];
    sessionsByDate[dateKey].push({
      time: `${formatTime(s.timeStart)}\u2013${formatTime(s.timeEnd)}`,
      notes: s.notes
    });
  });

  const scheduleHtml = cardSessions.length > 0
    ? `<div class="program-schedule">${Object.entries(sessionsByDate).map(([date, sesList]) => {
        const times = sesList.map(s => s.notes ? `${s.time} (${s.notes})` : s.time).join(', ');
        return `<div class="schedule-row"><span class="schedule-date">${date}</span> <span class="schedule-times">${times}</span></div>`;
      }).join('')}</div>`
    : '';

  return `
    <article class="program-card${isFull ? ' full' : ''}" data-id="${p.id}">
      <div class="program-card-header">
        ${badgeHtml}
        <h2 class="program-card-title">${p.name}</h2>
        ${dateRange ? `<p class="program-card-dates">${dateRange}</p>` : ''}
      </div>
      <div class="program-card-body">
        ${metaHtml || infoHtml ? `<div class="program-card-badges">${infoHtml}${metaHtml}</div>` : ''}
        ${descHtml}
        ${scheduleHtml}
      </div>
      <div class="program-card-footer">
        <span class="program-card-price">${p.price > 0 ? "&euro;" + p.price.toFixed(2) : bs("freeLabel")}</span>
        <div class="footer-right">
          ${spotsHtml}
          ${isFull
            ? `<button class="btn-register" disabled aria-disabled="true">${bs('soldOutBtn')}</button>`
            : (() => {
                // Native modal is the primary booking path (backend doPost pipeline).
                // External form link is the fallback when no backend is configured.
                if (BOOKING_BACKEND_URL) {
                  return `<button class="btn-register" data-program-id="${p.id}">${bs('registerBtn')}</button>`;
                }
                const formUrl = p.formUrl || CONFIG.DEFAULT_FORM_URL || '';
                if (formUrl) {
                  // Append program name as query param for form pre-fill
                  const separator = formUrl.includes('?') ? '&' : '?';
                  // Google Forms prefill needs the real entry ID (CONFIG.FORM_PROGRAM_ENTRY, from
                  // the form's "Get pre-filled link") - fall back to ?program= for other form providers
                  const programParam = CONFIG.FORM_PROGRAM_ENTRY || 'program';
                  const url = formUrl + separator + programParam + '=' + encodeURIComponent(p.name);
                  return `<a href="${url}" target="_blank" rel="noopener" class="btn-register btn-register-link">${bs('registerBtn')}</a>`;
                } else {
                  // No form URL configured — show disabled button
                  return `<button class="btn-register" disabled aria-disabled="true" title="${bs('alertNoConfig')}">${bs('registerBtn')}</button>`;
                }
              })()
          }
        </div>
      </div>
    </article>`;
}

// ─── Apply static page translations to DOM ───────────────────────────────────
function applyStaticTranslations() {
  var el;
  /* Set html lang attribute */
  document.documentElement.lang = window._bookingLang || 'en';
  /* Localized page title */
  document.title = bs('titleTag');
  /* All return links lead back to the homepage in the ACTIVE language */
  var homeHref = (window._bookingLang === 'de') ? '../de/' : '../';
  /* Header */
  el = document.querySelector('.booking-tosite-btn');              if (el) el.textContent = bs('toSite');
  el = document.querySelector('.booking-tosite-btn');              if (el) el.href = homeHref;
  el = document.querySelector('.booking-hero-title');              if (el) el.textContent = bs('heroTitle');
  el = document.querySelector('.booking-hero-tagline');            if (el) el.textContent = bs('heroTagline');
  /* Loading / states */
  el = document.querySelector('#programs-loading p');              if (el) el.textContent = bs('loading');
  el = document.querySelector('.programs-reserve-note');           if (el) el.textContent = bs('reserveNote');
  el = document.querySelector('#programs-empty p:first-of-type');  if (el) el.textContent = bs('noPrograms');
  el = document.querySelector('#programs-empty .empty-subtext');
  if (el) el.innerHTML = bs('checkBack') + '<a href="' + homeHref + '">' + bs('returnSiteLink') + '</a>.';
  /* Modal title */
  el = document.getElementById('modal-title');                     if (el) el.textContent = bs('modalTitle');
  /* Form labels — preserve child spans where needed */
  el = document.querySelector('label[for="field-name"]');
  if (el) el.innerHTML = bs('labelName') + ' <span class="required">*</span>';
  el = document.querySelector('label[for="field-email"]');
  if (el) el.innerHTML = bs('labelEmail') + ' <span class="required">*</span>';
  el = document.querySelector('label[for="field-phone"]');         if (el) el.textContent = bs('labelPhone');
  el = document.getElementById('discount-toggle-btn');             if (el) el.textContent = bs('discountToggle');
  el = document.querySelector('label[for="field-discount"]');      if (el) el.textContent = bs('labelDiscount');
  el = document.querySelector('.price-label');                     if (el) el.textContent = bs('labelTotal');
  el = document.querySelector('.group-label');
  if (el) el.innerHTML = bs('friendsQuestion') + ' <small class="field-hint">' + bs('friendsHint') + '</small>';
  /* Radio label text nodes */
  var radioNo  = document.querySelector('input[name="bringingFriends"][value="no"]');
  var radioYes = document.querySelector('input[name="bringingFriends"][value="yes"]');
  if (radioNo  && radioNo.parentElement)  radioNo.parentElement.childNodes.forEach(function(n)  { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ' ' + bs('radioNo') + ' '; });
  if (radioYes && radioYes.parentElement) radioYes.parentElement.childNodes.forEach(function(n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ' ' + bs('radioYes') + ' '; });
  /* Friends section */
  el = document.querySelector('label[for="field-friends-count"]'); if (el) el.textContent = bs('labelFriendCount');
  el = document.querySelector('label[for="field-friends-names"]'); if (el) el.textContent = bs('labelFriendNames');
  el = document.getElementById('field-friends-names');             if (el) el.placeholder = bs('friendsPlaceholder');
  /* Comments */
  el = document.querySelector('label[for="field-comments"]');      if (el) el.textContent = bs('labelComments');
  el = document.getElementById('field-comments');                  if (el) el.placeholder = bs('commentsPlaceholder');
  /* Submit button */
  el = document.getElementById('submit-label');                    if (el) el.textContent = bs('submitBtn');
  /* Success state */
  el = document.querySelector('#form-success h3');                 if (el) el.textContent = bs('successTitle');
  el = document.getElementById('success-detail');                  if (el) el.textContent = bs('successDefault');
  el = document.querySelector('.btn-back-site');                   if (el) el.textContent = bs('returnSiteBtn');
  el = document.querySelector('.booking-footer a');                if (el) { el.textContent = bs('footerReturn'); el.href = homeHref; }
  el = document.querySelector('.btn-back-site');                   if (el) el.href = homeHref;
}
// ─── End static translations ──────────────────────────────────────────────────

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(programId) {
  const program = programs.find(p => p.id === programId);
  if (!program) return;

  // Reset form state
  const form = document.getElementById('booking-form');
  form.reset();
  document.getElementById('form-success').style.display    = 'none';
  form.style.display                                         = '';
  document.getElementById('discount-result').textContent    = '';
  document.getElementById('discount-result').className      = 'discount-result';
  document.getElementById('discount-status').textContent    = '';
  document.getElementById('friends-section').style.display  = 'none';
  document.getElementById('submit-btn').disabled             = false;
  document.getElementById('submit-label').style.display     = '';
  document.getElementById('submit-spinner').style.display   = 'none';

  // Reset discount state
  activeDiscount  = { pct: 0, code: '', description: '' };
  friendsDiscount = { pct: 0, count: 0 };

  // Anti-spam timestamps: honeypot (server drops fills) + time-trap (<2s = bot)
  window._bookingFormLoadedAt = new Date().toISOString();

  // Populate hidden fields
  document.getElementById('field-program-id').value    = program.id;
  document.getElementById('field-program-name').value  = program.name;
  document.getElementById('field-program-price').value = program.price;

  // ── Package selector: rendered dynamically from the sheet-driven spec ──
  // Same grammar as backend resolvePackages_: "LABEL:base|LABEL:+80|LABEL:480"
  const pkgGroup  = document.getElementById('package-group');
  const pkgSelect = document.getElementById('field-package');
  const pkgDetail = document.getElementById('package-detail');
  pkgSelect.innerHTML = '';
  pkgDetail.textContent = '';
  const pkgs = (function (spec, base) {
    const out = [];
    if (!spec) return out;
    String(spec).split('|').forEach(part => {
      part = part.trim();
      if (!part) return;
      const m = part.match(/^([^:]+):(.+)$/);
      if (!m) return;
      const label = m[1].trim();
      const val = m[2].trim().toLowerCase();
      let price;
      if (val === 'base' || val === 'basis') price = base;
      else if (val.charAt(0) === '+') price = base + (parseFloat(val.slice(1).replace(',', '.')) || 0);
      else price = parseFloat(val.replace(',', '.')) || 0;
      if (isNaN(price)) return;
      out.push({
        key: label.toUpperCase()
          .replace(/\u00dc/g, 'UE').replace(/\u00c4/g, 'AE').replace(/\u00d6/g, 'OE').replace(/\u00df/g, 'SS')
          .replace(/[^A-Z0-9]/g, ''),
        label: label,
        price: Math.round(price * 100) / 100
      });
    });
    return out;
  })(program.packageSpec, program.price);

  if (pkgs.length > 1) {
    pkgs.forEach((pk, i) => {
      const opt = document.createElement('option');
      opt.value = pk.key;
      opt.dataset.price = pk.price;
      opt.textContent = `${pk.label} \u2014 \u20AC${pk.price.toFixed(2)}`;
      pkgSelect.appendChild(opt);
    });
    pkgGroup.style.display = '';
    // Show package contents hint from the description's package lines when present
    const descPkgLines = (program.description || '').split('\n').filter(l => /\u2022|BASIS|KOMFORT|\u00dcBERNACHTUNG/i.test(l));
    if (descPkgLines.length) pkgDetail.textContent = descPkgLines.join(' ');
  } else {
    // Single/implicit price — no selector
    pkgGroup.style.display = 'none';
  }
  window._modalPackages = pkgs;

  // Set modal title and program name
  document.getElementById('modal-title').textContent = bs('modalTitle');
  const progNameEl = document.getElementById('modal-program-name');
  if (progNameEl) progNameEl.textContent = program.name;

  // Re-apply submit label (may have been reset by form.reset())
  const submitLabel = document.getElementById('submit-label');
  if (submitLabel) submitLabel.textContent = bs('submitBtn');

  // Set initial price (package-aware)
  const initialPrice = pkgs.length > 1 ? pkgs[0].price : program.price;
  updatePriceDisplay(initialPrice);

  // Open overlay
  document.getElementById('modal-overlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus first input
  setTimeout(() => { document.getElementById('field-name').focus(); }, 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('is-open');
  document.body.style.overflow = '';
}

// ─── Price display ────────────────────────────────────────────────────────────
function updatePriceDisplay(basePrice) {
  const priceEl    = document.getElementById('price-value');
  const originalEl = document.getElementById('price-original');
  const resultEl   = document.getElementById('discount-result');

  // Total discount = manual code + friends discount (capped at 50%)
  const totalPct = Math.min(50, activeDiscount.pct + friendsDiscount.pct);

  if (totalPct > 0) {
    const discounted = basePrice * (1 - totalPct / 100);
    const savings    = basePrice - discounted;
    priceEl.textContent = `\u20AC${discounted.toFixed(2)}`;
    // Show original price struck-through
    if (originalEl) { originalEl.textContent = `\u20AC${basePrice.toFixed(2)}`; originalEl.style.display = ''; }
    resultEl.className  = 'discount-result is-valid';
    const parts = [];
    if (activeDiscount.pct > 0)  parts.push(bs('pctOff')(activeDiscount.description, activeDiscount.pct));
    if (friendsDiscount.pct > 0) parts.push(bs('friendsJoining')(friendsDiscount.count, friendsDiscount.pct));
    resultEl.innerHTML = parts.join(' + ') + bs('youSave')(savings.toFixed(2));
  } else {
    priceEl.textContent = `\u20AC${basePrice.toFixed(2)}`;
    // Hide original price
    if (originalEl) { originalEl.textContent = ''; originalEl.style.display = 'none'; }
    if (!activeDiscount.code) {
      resultEl.className   = 'discount-result';
      resultEl.textContent = '';
    }
  }
}

// ─── Discount code validation (debounced) ────────────────────────────────────
let discountDebounceTimer = null;

function onDiscountInput() {
  clearTimeout(discountDebounceTimer);
  discountDebounceTimer = setTimeout(() => {
    const value = document.getElementById('field-discount').value.trim().toUpperCase();
    validateDiscountCode(value);
  }, 400);
}

function validateDiscountCode(value) {
  const statusEl  = document.getElementById('discount-status');
  const resultEl  = document.getElementById('discount-result');
  const basePrice = parseFloat(document.getElementById('field-program-price').value) || 0;

  if (!value) {
    activeDiscount = { pct: 0, code: '', description: '' };
    statusEl.textContent = '';
    resultEl.textContent = '';
    resultEl.className   = 'discount-result';
    updatePriceDisplay(basePrice);
    return;
  }

  const match = discountCodes.find(d => d.code === value);
  if (match) {
    activeDiscount = { pct: match.pct, code: match.code, description: match.description };
    statusEl.textContent = '\u2714\ufe0f';
    updatePriceDisplay(basePrice);
  } else {
    activeDiscount = { pct: 0, code: '', description: '' };
    statusEl.textContent = '\u274c';
    resultEl.className   = 'discount-result is-invalid';
    resultEl.textContent = bs('codeInvalid');
    updatePriceDisplay(basePrice);
  }
}

// ─── Friends toggle ───────────────────────────────────────────────────────────
function toggleFriends(show) {
  document.getElementById('friends-section').style.display = show ? '' : 'none';
  if (!show) {
    // Reset friends discount when hiding section
    friendsDiscount = { pct: 0, count: 0 };
    const hint = document.getElementById('friends-discount-hint');
    if (hint) hint.style.display = 'none';
    const basePrice = parseFloat(document.getElementById('field-program-price').value) || 0;
    updatePriceDisplay(basePrice);
  }
}

// Toggle discount code field visibility
function toggleDiscountField() {
  const container = document.getElementById('discount-field-container');
  const btn       = document.getElementById('discount-toggle-btn');
  if (container.style.display === 'none') {
    container.style.display    = 'flex';
    container.style.flexDirection = 'column';
    btn.style.display          = 'none';
    // Focus the input after a short delay for animation
    setTimeout(() => { document.getElementById('field-discount').focus(); }, 100);
  }
}

// ─── Friends count change — auto-apply 10% per friend ────────────────────────
function onFriendsCountChange() {
  const count     = parseInt(document.getElementById('field-friends-count').value) || 0;
  const basePrice = parseFloat(document.getElementById('field-program-price').value) || 0;
  const hint      = document.getElementById('friends-discount-hint');

  if (count > 0) {
    const pct       = count * 10; // 10% per friend
    const cappedPct = Math.min(50, pct);
    friendsDiscount = { pct: cappedPct, count: count };
    if (hint) {
      hint.textContent = bs('friendsHintText')(count, cappedPct);
      hint.style.display = '';
    }
  } else {
    friendsDiscount = { pct: 0, count: 0 };
    if (hint) hint.style.display = 'none';
  }

  updatePriceDisplay(basePrice);
}

// ─── Contact fallback for error messaging ─────────────────────────────────────
const INSTRUCTOR_CONTACT_EMAIL = 'info@innerevolutionyoga.life';

// Simple but robust email validator (RFC-5322 subset)
function isValidEmailFormat(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

// ─── Form submission ──────────────────────────────────────────────────────────
// Transport strategy (mirrors newsletter.js): try a READABLE POST first
// (Content-Type: text/plain avoids the CORS preflight; Apps Script returns
// JSON the browser can read when the redirect chain cooperates). If the
// browser blocks it (opaque redirect), fall back to a no-cors POST.
// Both paths are safe to retry: the payload carries a client-side bookingId
// and the backend replies idempotently for known IDs (no duplicate rows).
function makeBookingId() {
  var d = new Date();
  var pad = function (n) { return ('0' + n).slice(-2); };
  var stamp = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'BK-' + stamp + '-' + rnd;
}

// Single POST attempt. Resolves { ok, data?, opaque? } — never throws.
function postBooking(payload, timeoutMs) {
  return new Promise(function (resolve) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, timeoutMs || 15000);
    var finish = function (res) { clearTimeout(timer); resolve(res); };

    const backendUrl = BOOKING_BACKEND_URL;

    fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // no preflight
      redirect: 'follow',
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        // Readable response — parse the real backend verdict
        return res.json().then(function (data) {
          finish({ ok: res.ok && !!data.success, data: data });
        }, function () {
          finish({ ok: res.ok, data: null });
        });
      })
      .catch(function () {
        // Network error OR opaque CORS block — one opaque fallback attempt
        fetch(backendUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify(payload),
        })
          .then(function () { finish({ ok: true, opaque: true }); })
          .catch(function () { finish({ ok: false }); });
      });
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  // Guard: Apps Script URL not configured
  if (!BOOKING_BACKEND_URL) {
    alert(bs('alertNoConfig'));
    return;
  }

  const btn     = document.getElementById('submit-btn');
  const label   = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  // ── Pre-submit validation (fast feedback; backend re-validates anyway) ──
  const name  = document.getElementById('field-name').value.trim();
  const email = document.getElementById('field-email').value.trim();
  const phone = document.getElementById('field-phone').value.trim();

  if (!name || !email || !phone) {
    alert(bs('alertFillIn'));
    return;
  }
  if (!isValidEmailFormat(email)) {
    alert(bs('alertInvalidEmail'));
    document.getElementById('field-email').focus();
    return;
  }

  // Disable button, show spinner
  btn.disabled          = true;
  label.style.display   = 'none';
  spinner.style.display = '';

  const basePrice  = parseFloat(document.getElementById('field-program-price').value) || 0;
  const totalPct   = Math.min(50, activeDiscount.pct + friendsDiscount.pct);
  const finalPrice = totalPct > 0 ? basePrice * (1 - totalPct / 100) : basePrice;

  const bringingFriends = document.querySelector('input[name="bringingFriends"]:checked')?.value === 'yes';
  const pkgSelect = document.getElementById('field-package');
  const pkgKey    = (pkgSelect && pkgSelect.offsetParent !== null && pkgSelect.value) ? pkgSelect.value : '';
  // Package price overrides the card base price for discount math (parity with backend)
  const effectiveBase = (pkgKey && window._modalPackages) ?
    ((window._modalPackages.find(pk => pk.key === pkgKey) || {}).price || basePrice) : basePrice;
  const effectiveFinal = totalPct > 0 ? effectiveBase * (1 - totalPct / 100) : effectiveBase;

  const payload = {
    action:             'booking',
    bookingId:          makeBookingId(),          // idempotent retry key (server replays)
    programId:          document.getElementById('field-program-id').value,
    programName:        document.getElementById('field-program-name').value,
    packageKey:         pkgKey,
    basePrice:          effectiveBase,
    finalPrice:         parseFloat(effectiveFinal.toFixed(2)),
    discountCode:       activeDiscount.code,
    discountPct:        activeDiscount.pct,
    friendsDiscountPct: friendsDiscount.pct,
    totalDiscountPct:   totalPct,
    fullName:           name,
    email:              email,
    phone:              phone,
    bringingFriends:    bringingFriends,
    friendsCount:       bringingFriends ? (document.getElementById('field-friends-count').value || '') : '',
    friendsNames:       bringingFriends ? (document.getElementById('field-friends-names').value.trim() || '') : '',
    comments:           document.getElementById('field-comments').value.trim(),
    website:            document.getElementById('field-website').value,  // honeypot (must stay empty)
    formLoadedAt:       window._bookingFormLoadedAt || '',               // time-trap reference
    lang:               window._bookingLang || 'en',
    submittedAt:        new Date().toISOString(),
  };

  // First attempt, then ONE automatic retry (idempotent — same bookingId)
  let result = await postBooking(payload, 15000);
  if (!result.ok || result.opaque) {
    payload.bookingId = payload.bookingId; // keep the SAME id — server replays if the first attempt landed
    result = await postBooking(payload, 20000);
  }

  if (result.ok) {
    document.getElementById('booking-form').style.display = 'none';
    document.getElementById('form-success').style.display = '';
    const payUrl = result.data && result.data.paymentUrl;
    const detail = document.getElementById('success-detail');
    if (payUrl) {
      detail.textContent = bs('successPayLink')(email);
      // Direct payment button — saves the user a mailbox round-trip
      let payBtn = document.getElementById('success-pay-btn');
      if (!payBtn) {
        payBtn = document.createElement('a');
        payBtn.id = 'success-pay-btn';
        payBtn.className = 'btn-primary success-pay-btn';
        payBtn.target = '_blank';
        payBtn.rel = 'noopener';
        detail.parentNode.insertBefore(payBtn, detail.nextSibling);
      }
      payBtn.href = payUrl;
      payBtn.style.display = '';
      payBtn.textContent = bs('payNowBtn');
    } else {
      // MANUAL PAYMENT MODE: clear promise - payment details arrive by email
      detail.textContent = bs('successManual')(email) + ' ' + bs('successSpamTip');
      const staleBtn = document.getElementById('success-pay-btn');
      if (staleBtn) staleBtn.style.display = 'none';
    }
  } else {
    // Real backend verdict or total network failure — tell the user honestly
    const serverMsg = result.data && result.data.error ? result.data.error : '';
    alert((serverMsg ? serverMsg : bs('alertNetwork')) + '\n\n' + bs('successContactFallback')(INSTRUCTOR_CONTACT_EMAIL));
    btn.disabled          = false;
    label.style.display   = '';
    spinner.style.display = 'none';
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply language translations first
  applyStaticTranslations();

  // ── Modal, discount, friends, form submit — native booking re-enabled ──
  // Modal close listeners
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Discount input
  document.getElementById('field-discount').addEventListener('input', onDiscountInput);

  // Discount toggle button
  document.getElementById('discount-toggle-btn').addEventListener('click', toggleDiscountField);

  // Friends radio buttons
  document.querySelectorAll('input[name="bringingFriends"]').forEach(function(radio) {
    radio.addEventListener('change', function() { toggleFriends(this.value === 'yes'); });
  });

  // Friends count input
  document.getElementById('field-friends-count').addEventListener('input', onFriendsCountChange);

  // Package selector — live price updates when switching packages
  const pkgSel = document.getElementById('field-package');
  if (pkgSel) {
    pkgSel.addEventListener('change', function () {
      const pk = (window._modalPackages || []).find(p => p.key === this.value);
      if (pk) updatePriceDisplay(pk.price);
    });
  }

  // Register buttons — open the native modal
  document.getElementById('programs-grid').addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-register');
    if (btn && !btn.disabled && btn.dataset.programId) openModal(btn.dataset.programId);
  });

  // Form submit
  document.getElementById('booking-form').addEventListener('submit', handleSubmit);

  // Local dev detection: Five Server, Live Server, file:// etc.
  // Skip Sheets API on local servers (blocked by API key domain restrictions / Brave Shields)
  const hn = location.hostname;
  const isLocal = hn === 'localhost' || hn === '127.0.0.1' || hn === '0.0.0.0' || hn === '[::1]' || /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(hn) || location.protocol === 'file:';

  // Fetch all data in parallel
  try {
    if (isLocal) {
      // Load cached Sheet data instead of Google Sheets API (blocked on localhost)
      try {
        const resp = await fetch('../data/sheet-cache.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('sheet-cache.json not found');
        const cache = await resp.json();
        const progRows = cache.programs || [];
        const sessRows = cache.sessions || [];
        programs = progRows.map(r => ({
          id:               (r[0] || '').toString().trim(),
          name:             r[1] || '',
          price:            parseFloat(r[2]) || 0,
          spotsTotal:       r[3] !== '' && r[3] !== undefined && r[3] !== null ? parseInt(r[3]) : null,
          spotsLeft:        r[4] !== '' && r[4] !== undefined && r[4] !== null ? parseInt(r[4]) : null,
          active:           ['TRUE','YES','1'].includes((r[5] || '').toString().toUpperCase().trim()),
          startDate:        serialToISO(r[6] || ''),
          endDate:          '',
          sessionCount:     parseInt(r[7]) || 0,
          hoursPerSession:  parseFloat(r[8]) || 0,
          totalHours:       parseFloat(r[9]) || 0,
          stripePaymentLink: '',
          description:      r[10] || '',
          location:         r[11] || '',
          language:         r[12] || '',
          formUrl:          r[13] || '',   // Column N — external registration form URL
          packageSpec:      r[14] || '',   // Column O — sheet-driven packages spec (native modal)
          image: '', format: '',
        }));
        sessions = sessRows.map(r => ({
          programId:  (r[0] || '').toString().trim(),
          sessionNum: parseInt(r[2]) || 0,
          date:       serialToISO(r[3] || ''),
          timeStart:  serialToTime(r[4] || ''),
          timeEnd:    serialToTime(r[5] || ''),
          notes:      '',
        }));
        // Load discount codes from cache if available
        const codeRows = cache.discountCodes || [];
        discountCodes = codeRows.map(r => ({
          code:        (r[0] || '').toUpperCase().trim(),
          pct:         parseFloat(r[1]) || 0,
          description: r[2] || '',
        }));
      } catch (cacheErr) {
        console.warn('Could not load sheet-cache.json:', cacheErr);
        programs = [];
      }
    } else {
      // fetchDiscountCodes disabled — booking now uses external form links
      // await Promise.all([ fetchPrograms(), fetchSessions(), fetchDiscountCodes().catch(() => []) ]);
      await Promise.all([ fetchPrograms(), fetchSessions() ]);
    }
    renderPrograms();
    // Deep link: /booking/?program=SK-001 — scroll to and highlight the program card
    const urlParams = new URLSearchParams(window.location.search);
    const preselect = urlParams.get('program');
    if (preselect) {
      setTimeout(() => {
        const card = document.querySelector(`[data-id="${preselect}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('is-highlighted');
          setTimeout(() => card.classList.remove('is-highlighted'), 3000);
        }
      }, 200);
    }
  } catch (err) {
    console.error('Failed to load booking data:', err);
    document.getElementById('programs-loading').innerHTML =
      '<p style="color:#DF7366;text-align:center;">Failed to load programs. Please refresh or try again later.</p>';
  }
});
