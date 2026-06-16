// booking/booking.js
// Booking page logic — fetches programs from Google Sheets, handles registration modal.
// Depends on CONFIG from config.js (gitignored locally, injected at deploy time).

'use strict';

// ─── Booking i18n ─────────────────────────────────────────────────────────────
var BOOKING_STRINGS = {
  en: {
    toSite:             '\u2190 To Website',
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
    alertTimeout:       'The request is taking longer than expected. Your booking may still go through \u2014 please check your email in a few minutes before retrying.',
    alertNetwork:       'We couldn\u2019t reach the booking server. Please check your internet connection and try again.',
    alertInvalidEmail:  'Please enter a valid email address (e.g. name@example.com).',
    dateLocale:         'en-GB',
  },
  de: {
    toSite:             '\u2190 Zur Website',
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
  const rows = await fetchSheet('Programs!A3:N');  // A–M = program data, N = formUrl
  programs = rows.map(r => ({
    id:               (r[0] || '').toString().trim(),
    name:             r[1] || '',
    price:            parseFloat(r[2]) || 0,
    spotsTotal:       parseInt(r[3]) || 0,
    spotsLeft:        parseInt(r[4]) || 0,
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

  const active = programs.filter(p => p.active);
  if (active.length === 0) {
    empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  grid.innerHTML = active.map(p => buildCard(p)).join('');
}

function buildCard(p) {
  const isFull       = p.spotsLeft <= 0;
  const cardSessions = sessions.filter(s => s.programId === p.id);

  const spotsHtml = isFull
    ? `<span class="spots-full">${bs('soldOutSpots')}</span>`
    : `<span class="spots-available">${bs('spotsLeft')(p.spotsLeft)}</span>`;

  const badgeHtml = isFull ? `<span class="badge-full">${bs('fullBadge')}</span>` : '';

  const dateRange = p.startDate
    ? `${formatDate(p.startDate)}${p.endDate && p.endDate !== p.startDate ? ' &ndash; ' + formatDate(p.endDate) : ''}`
    : '';

  const descHtml = p.description
    ? `<p class="program-card-description">${p.description}</p>`
    : '';

  const infoHtml = [
    p.sessionCount ? `${p.sessionCount} session${p.sessionCount !== 1 ? 's' : ''}` : '',
    p.totalHours   ? `${p.totalHours} hrs` : ''
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
        <span class="program-card-price">&euro;${p.price.toFixed(2)}</span>
        <div class="footer-right">
          ${spotsHtml}
          ${isFull
            ? `<button class="btn-register" disabled aria-disabled="true">${bs('soldOutBtn')}</button>`
            : (() => {
                const formUrl = p.formUrl || CONFIG.DEFAULT_FORM_URL || '';
                if (formUrl) {
                  // Append program name as query param for form pre-fill
                  const separator = formUrl.includes('?') ? '&' : '?';
                  const url = formUrl + separator + 'program=' + encodeURIComponent(p.name);
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
  /* Header */
  el = document.querySelector('.booking-tosite-btn');              if (el) el.textContent = bs('toSite');
  el = document.querySelector('.booking-hero-title');              if (el) el.textContent = bs('heroTitle');
  el = document.querySelector('.booking-hero-tagline');            if (el) el.textContent = bs('heroTagline');
  /* Loading / states */
  el = document.querySelector('#programs-loading p');              if (el) el.textContent = bs('loading');
  el = document.querySelector('.programs-reserve-note');           if (el) el.textContent = bs('reserveNote');
  el = document.querySelector('#programs-empty p:first-of-type');  if (el) el.textContent = bs('noPrograms');
  el = document.querySelector('#programs-empty .empty-subtext');
  if (el) el.innerHTML = bs('checkBack') + '<a href="../">' + bs('returnSiteLink') + '</a>.';
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

  // Populate hidden fields
  document.getElementById('field-program-id').value    = program.id;
  document.getElementById('field-program-name').value  = program.name;
  document.getElementById('field-program-price').value = program.price;

  // Set modal title and program name
  document.getElementById('modal-title').textContent = bs('modalTitle');
  const progNameEl = document.getElementById('modal-program-name');
  if (progNameEl) progNameEl.textContent = program.name;

  // Re-apply submit label (may have been reset by form.reset())
  const submitLabel = document.getElementById('submit-label');
  if (submitLabel) submitLabel.textContent = bs('submitBtn');

  // Set initial price
  updatePriceDisplay(program.price);

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
// NOTE: We use `fetch(..., { mode: 'no-cors' })` because Google Apps Script web
// apps 302-redirect to googleusercontent.com without Access-Control-Allow-Origin
// headers, which the browser blocks on a cross-origin POST from innerevolutionyoga.life.
// Tradeoff: the response is OPAQUE — we cannot read Apps Script's JSON reply.
// Mitigation: pre-validate aggressively here; Apps Script sends all confirmation,
// error and admin-alert emails server-side.
async function handleSubmit(event) {
  event.preventDefault();

  // Guard: Apps Script URL not configured
  if (!CONFIG.APPS_SCRIPT_URL) {
    alert(bs('alertNoConfig'));
    return;
  }

  const btn     = document.getElementById('submit-btn');
  const label   = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  // ── Pre-submit validation (critical — we can't read server response) ──
  const name  = document.getElementById('field-name').value.trim();
  const email = document.getElementById('field-email').value.trim();

  if (!name || !email) {
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

  const payload = {
    programId:          document.getElementById('field-program-id').value,
    programName:        document.getElementById('field-program-name').value,
    basePrice:          basePrice,
    finalPrice:         parseFloat(finalPrice.toFixed(2)),
    discountCode:       activeDiscount.code,
    discountPct:        activeDiscount.pct,
    friendsDiscountPct: friendsDiscount.pct,
    totalDiscountPct:   totalPct,
    fullName:           name,
    email:              email,
    phone:              document.getElementById('field-phone').value.trim(),
    bringingFriends:    bringingFriends,
    friendsCount:       bringingFriends ? (document.getElementById('field-friends-count').value || '') : '',
    friendsNames:       bringingFriends ? (document.getElementById('field-friends-names').value.trim() || '') : '',
    comments:           document.getElementById('field-comments').value.trim(),
    lang:               window._bookingLang || 'en',
    submittedAt:        new Date().toISOString(),
  };

  // ── Fire the request with a 15-second abort timeout ──
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15000);

  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:   'POST',
      mode:     'no-cors',
      redirect: 'follow',
      body:     JSON.stringify(payload),
      signal:   controller.signal,
    });
    clearTimeout(timeoutId);

    // Request completed without network error — assume success.
    // Apps Script is now responsible for ALL success/failure communication via email.
    document.getElementById('booking-form').style.display = 'none';
    document.getElementById('form-success').style.display = '';
    document.getElementById('success-detail').textContent =
      bs('successFallback')(email) + ' ' +
      bs('successSpamTip')  + ' ' +
      bs('successContactFallback')(INSTRUCTOR_CONTACT_EMAIL);

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Booking submission failed:', err);

    // Classify the failure for a useful user message
    let userMsg;
    if (err.name === 'AbortError') {
      userMsg = bs('alertTimeout');
    } else {
      // TypeError 'Failed to fetch' = network / DNS / offline
      userMsg = bs('alertNetwork');
    }
    alert(userMsg + '\n\n' + bs('successContactFallback')(INSTRUCTOR_CONTACT_EMAIL));

    // Re-enable the button so the user can retry
    btn.disabled          = false;
    label.style.display   = '';
    spinner.style.display = 'none';
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply language translations first
  applyStaticTranslations();

  // ── DISABLED: Modal, discount, friends, form submit — booking now uses external form links ──
  // Modal close listeners
  // document.getElementById('modal-close').addEventListener('click', closeModal);
  // document.getElementById('modal-overlay').addEventListener('click', e => {
  //   if (e.target === e.currentTarget) closeModal();
  // });
  // document.addEventListener('keydown', e => {
  //   if (e.key === 'Escape') closeModal();
  // });

  // Discount input
  // document.getElementById('field-discount').addEventListener('input', onDiscountInput);

  // Discount toggle button
  // document.getElementById('discount-toggle-btn').addEventListener('click', toggleDiscountField);

  // Friends radio buttons
  // document.querySelectorAll('input[name="bringingFriends"]').forEach(function(radio) {
  //   radio.addEventListener('change', function() { toggleFriends(this.value === 'yes'); });
  // });

  // Friends count input
  // document.getElementById('field-friends-count').addEventListener('input', onFriendsCountChange);

  // Register buttons — no longer needed, buttons are now <a> links
  // document.getElementById('programs-grid').addEventListener('click', function(e) {
  //   var btn = e.target.closest('.btn-register');
  //   if (btn && !btn.disabled) openModal(btn.dataset.programId);
  // });

  // Form submit
  // document.getElementById('booking-form').addEventListener('submit', handleSubmit);

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
          spotsTotal:       parseInt(r[3]) || 0,
          spotsLeft:        parseInt(r[4]) || 0,
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
