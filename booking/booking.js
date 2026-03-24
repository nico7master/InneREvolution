// booking/booking.js
// Booking page logic — fetches programs from Google Sheets, handles registration modal.
// Depends on CONFIG from config.js (gitignored locally, injected at deploy time).

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let programs       = [];
let sessions       = [];
let discountCodes  = [];
let activeDiscount = { pct: 0, code: '', description: '' };

// ─── Sheets API helper ────────────────────────────────────────────────────────
async function fetchSheet(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.SHEETS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error ${res.status} for range: ${range}`);
  const data = await res.json();
  return data.values || [];
}

// ─── Data fetchers ────────────────────────────────────────────────────────────
async function fetchPrograms() {
  // Columns: A=ProgramID, B=Name, C=Price, D=SpotsTotal, E=SpotsLeft,
  //          F=Active, G=StartDate, H=EndDate, I=StripePaymentLink
  const rows = await fetchSheet('Programs!A2:I');
  programs = rows.map(r => ({
    id:               r[0] || '',
    name:             r[1] || '',
    price:            parseFloat(r[2]) || 0,
    spotsTotal:       parseInt(r[3]) || 0,
    spotsLeft:        parseInt(r[4]) || 0,
    active:           (r[5] || '').toString().toUpperCase() === 'TRUE' || r[5] === '1',
    startDate:        r[6] || '',
    endDate:          r[7] || '',
    stripePaymentLink: r[8] || '',
  }));
}

async function fetchSessions() {
  // Columns: A=ProgramID, B=SessionNum, C=Date(ISO), D=TimeStart, E=TimeEnd, F=Notes
  const rows = await fetchSheet('Sessions!A2:F');
  sessions = rows.map(r => ({
    programId:  r[0] || '',
    sessionNum: parseInt(r[1]) || 0,
    date:       r[2] || '',
    timeStart:  r[3] || '',
    timeEnd:    r[4] || '',
    notes:      r[5] || '',
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
  // Input: ISO date string e.g. "2026-05-02" or "2026-05-02T18:00:00"
  // Output: "Sat 02 May"
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
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
  const isFull      = p.spotsLeft <= 0;
  const cardSessions = sessions.filter(s => s.programId === p.id);

  const spotsHtml = isFull
    ? `<span class="spots-full">Sold out</span>`
    : `<span class="spots-available">${p.spotsLeft} spot${p.spotsLeft === 1 ? '' : 's'} left</span>`;

  const badgeHtml = isFull ? `<span class="badge-full">Full</span>` : '';

  const dateRange = p.startDate
    ? `${formatDate(p.startDate)}${p.endDate && p.endDate !== p.startDate ? ' &ndash; ' + formatDate(p.endDate) : ''}`
    : '';

  const scheduleHtml = cardSessions.length > 0
    ? `<ul class="program-schedule">${cardSessions.map(s =>
        `<li>${formatDate(s.date)} &bull; ${formatTime(s.timeStart)}&ndash;${formatTime(s.timeEnd)}${s.notes ? ' <em>(' + s.notes + ')</em>' : ''}</li>`
      ).join('')}</ul>`
    : '';

  return `
    <article class="program-card${isFull ? ' full' : ''}" data-id="${p.id}">
      <div class="program-card-header">
        ${badgeHtml}
        <h2 class="program-card-title">${p.name}</h2>
        ${dateRange ? `<p class="program-card-dates">${dateRange}</p>` : ''}
      </div>
      <div class="program-card-body">
        ${scheduleHtml}
      </div>
      <div class="program-card-footer">
        <span class="program-card-price">&euro;${p.price.toFixed(2)}</span>
        <div class="footer-right">
          ${spotsHtml}
          <button
            class="btn-register"
            onclick="openModal('${p.id}')"
            ${isFull ? 'disabled aria-disabled="true"' : ''}>
            ${isFull ? 'Sold Out' : 'Register'}
          </button>
        </div>
      </div>
    </article>`;
}

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
  activeDiscount = { pct: 0, code: '', description: '' };

  // Populate hidden fields
  document.getElementById('field-program-id').value    = program.id;
  document.getElementById('field-program-name').value  = program.name;
  document.getElementById('field-program-price').value = program.price;

  // Set modal title
  document.getElementById('modal-title').textContent = `Register: ${program.name}`;

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
  const resultEl   = document.getElementById('discount-result');

  if (activeDiscount.pct > 0) {
    const discounted = basePrice * (1 - activeDiscount.pct / 100);
    const savings    = basePrice - discounted;
    priceEl.textContent = `\u20AC${discounted.toFixed(2)}`;
    resultEl.className  = 'discount-result is-valid';
    resultEl.innerHTML  = `${activeDiscount.description} &mdash; you save &euro;${savings.toFixed(2)}`;
  } else {
    priceEl.textContent = `\u20AC${basePrice.toFixed(2)}`;
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
  const statusEl = document.getElementById('discount-status');
  const resultEl = document.getElementById('discount-result');
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
    resultEl.textContent = 'Code not recognised.';
    updatePriceDisplay(basePrice);
  }
}

// ─── Friends toggle ───────────────────────────────────────────────────────────
function toggleFriends(show) {
  document.getElementById('friends-section').style.display = show ? '' : 'none';
}

// ─── Form submission ──────────────────────────────────────────────────────────
async function handleSubmit(event) {
  event.preventDefault();

  const btn     = document.getElementById('submit-btn');
  const label   = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  // Basic validation
  const name  = document.getElementById('field-name').value.trim();
  const email = document.getElementById('field-email').value.trim();
  if (!name || !email) {
    alert('Please fill in your name and email.');
    return;
  }

  // Disable button, show spinner
  btn.disabled          = true;
  label.style.display   = 'none';
  spinner.style.display = '';

  const basePrice  = parseFloat(document.getElementById('field-program-price').value) || 0;
  const finalPrice = activeDiscount.pct > 0
    ? basePrice * (1 - activeDiscount.pct / 100)
    : basePrice;

  const invitedByFriend = document.querySelector('input[name="invitedByFriend"]:checked')?.value === 'yes';

  const payload = {
    programId:      document.getElementById('field-program-id').value,
    programName:    document.getElementById('field-program-name').value,
    basePrice:      basePrice,
    finalPrice:     parseFloat(finalPrice.toFixed(2)),
    discountCode:   activeDiscount.code,
    discountPct:    activeDiscount.pct,
    name:           name,
    email:          email,
    phone:          document.getElementById('field-phone').value.trim(),
    invitedByFriend: invitedByFriend,
    friendsCount:   invitedByFriend ? (document.getElementById('field-friends-count').value || '') : '',
    friendsNames:   invitedByFriend ? (document.getElementById('field-friends-names').value.trim() || '') : '',
    comments:       document.getElementById('field-comments').value.trim(),
    submittedAt:    new Date().toISOString(),
  };

  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    // Show success state
    document.getElementById('booking-form').style.display = 'none';
    document.getElementById('form-success').style.display  = '';
    document.getElementById('success-detail').textContent  =
      `Check your inbox at ${email} for the payment link and confirmation.`;

  } catch (err) {
    console.error('Booking submission failed:', err);
    alert('Something went wrong submitting your registration. Please try again or contact us directly.');

    // Re-enable button
    btn.disabled          = false;
    label.style.display   = '';
    spinner.style.display = 'none';
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Wire up modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Wire up discount input
  document.getElementById('field-discount').addEventListener('input', onDiscountInput);

  // Wire up form submit
  document.getElementById('booking-form').addEventListener('submit', handleSubmit);

  // Fetch all data in parallel
  try {
    await Promise.all([ fetchPrograms(), fetchSessions(), fetchDiscountCodes() ]);
    renderPrograms();
  } catch (err) {
    console.error('Failed to load booking data:', err);
    document.getElementById('programs-loading').innerHTML =
      '<p style="color:#DF7366;text-align:center;">Failed to load programs. Please refresh or try again later.</p>';
  }
});
