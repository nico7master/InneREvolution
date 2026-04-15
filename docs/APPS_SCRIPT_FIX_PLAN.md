# InneREvolution Apps Script — Fix & Improvement Plan

**Created**: 2026-03-31  
**Last Updated**: 2026-03-31  
**Status**: Phase 1 + Phase 2 deployed (v49 live)  
**Local file**: `/a0/usr/projects/innerevolution_website/docs/apps-script.js`  
**Script ID**: `10ha96r1KDUAi_NfHU2QZb-R_Nd_fK9pv0jTc9I90KIvn9dk4_GOAa2Ak`  
**Sheet 4 ID**: `1fzXqhX-6B04Q-BMf0QNC3OWyGjIbU-CaqTLb3SwMHPU`  
**Sheet 3 (Kursangebot)**: `1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU`

---

## Phase 0 — DEPLOYMENT ✅ COMPLETE

### 0.1 ✅ `.clasprc.json` uploaded and working
### 0.2 ✅ Web App deployed (v49) — automated via REST API
- Version 48: Phase 1 bug fixes
- Version 49: Phase 2 improvements (LockService, duplicate prevention, input validation)

---

## Phase 1 — CRITICAL BUGS (Fixed locally, need deployment)

### 1.1 ✅ `handleBooking()` crashes — undefined variables
- **Bug**: Lines 192-198 used `progData` and `prog` (never defined)
- **Impact**: Spots counter NEVER decremented → overbooking risk
- **Fix**: Changed to `kursData`/`kurs`, correct column B (Instance ID), writes to col M (Angemeldet)
- **File**: `apps-script.js` lines ~192-208

### 1.2 ✅ All 4 daily triggers crash silently
- **Bug**: `checkFriendReferrals`, `sendPaymentReminders`, `sendDailyReport`, `syncSessionsToCalendar` all call `SpreadsheetApp.getUi()` which throws when run by time-based triggers
- **Impact**: Daily automation has NEVER worked as scheduled
- **Fix**: Added `safeAlert()` helper that logs silently from triggers, shows UI from menu
- **File**: `apps-script.js` line ~102 (safeAlert function) + all 4 functions

### 1.3 ✅ 7+ functions reference non-existent "Programs" sheet
- **Bug**: Code referenced `'Programs'` sheet — actual name is `'🧘 Kursplanung'` with different column layout
- **Affected**: sendPaymentReminders, sendDailyReport, syncSessionsToCalendar, formatSheet, applyConditionalFormatting, applyDataValidations, recolorAllRows, createAllStripeLinks, onEdit
- **Fix**: All references updated to `'🧘 Kursplanung'` with correct column mappings:
  - Old Programs col A (ID) → Kursplanung col B (Instance ID)
  - Old Programs col B (Name) → Kursplanung col D (Kursname)
  - Old Programs col E (SpotsLeft) → Kursplanung K-M (MaxTN - Angemeldet)
  - Old Programs col F (Active) → Kursplanung col N (Website?)
  - Old Programs col I (StripeLink) → Kursplanung col U (StripeLink)
  - Data starts at row 4 (3 header rows) instead of row 2

### 1.4 ✅ Dashboard formulas reference non-existent sheets
- **Bug**: `buildDashboard()` generated formulas like `Bookings!B2:B` and `Programs!F2:F`
- **Actual names**: `'📋 Buchungen'` and `'🧘 Kursplanung'` (need single quotes for emoji)
- **Fix**: All formulas now use `'📋 Buchungen'!` and `'🧘 Kursplanung'!` with correct columns

---

## Phase 2 — HIGH PRIORITY IMPROVEMENTS (Partially deployed)

### 2.1 Stripe webhook signature verification
- **Risk**: Currently `doPost` accepts ANY POST with `payment_intent` in the type field
- **Impact**: Someone could forge a payment confirmation
- **Fix**: Use Stripe webhook signing secret (`WHSEC_xxx`) to verify signature
- **Implementation**:
  ```javascript
  // In handleStripeWebhook():
  var sigHeader = e.parameter['Stripe-Signature'] || '';
  var endpointSecret = PropertiesService.getScriptProperties().getProperty('STRIPE_WEBHOOK_SECRET');
  // Compute HMAC-SHA256 and compare
  ```
- **Effort**: Medium (need to implement HMAC in Apps Script)

### 2.2 ✅ Race condition in spot counting (LockService) — DEPLOYED v49
- **Risk**: Two simultaneous bookings could both read same `angemeldet` count
- **Fix**: Entire booking critical section wrapped with `LockService.getScriptLock()` + `try/finally`
- Re-reads fresh data inside lock, releases lock in finally block

### 2.3 ✅ Duplicate booking prevention — DEPLOYED v49
- **Risk**: Same person could submit booking form twice and get double-charged
- **Fix**: Before entering lock, checks if email+programId combo already exists in Buchungen
- Returns friendly error: "You are already registered for this program."

### 2.5 ✅ Input validation — DEPLOYED v49
- Basic email format validation (must contain @)
- Returns clear error for invalid email addresses

### 2.4 Email rate limiting for payment reminders
- **Risk**: `sendPaymentReminders` sends to ALL unpaid bookings >2 days old, EVERY DAY
- **Impact**: Same person gets daily reminder emails forever
- **Fix**: Add a "Last Reminder Sent" column (or track in Script Properties) and only send once per 5-7 days
- **Effort**: Medium

---

## Phase 3 — SHEET 3 (KURSANGEBOT) & WEBSITE DATA FLOW

### Current State
- **Sheet 3** (`1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU`): Public-facing course listing
  - Contains: Program ID, Name, Price, Spots Total, Spots Left, Active, Start Date, Sessions, Std/Sess, Total Std, Description, Location, Language
  - Currently has static data (2 courses), NO IMPORTRANGE formulas detected
  - Apps Script: Wiped to minimal placeholder (doGet health check only) — correct

### How It SHOULD Work

```
┌─────────────────────┐      IMPORTRANGE       ┌─────────────────────┐
│  Sheet 4             │ ──────────────────────► │  Sheet 3            │
│  🧘 Kursplanung      │  (auto-syncs selected  │  Kursangebot        │
│  (master data)       │   columns)             │  (public-facing)    │
│  - All course data   │                        │  - Name, Price,     │
│  - Bookings mgmt     │                        │    Spots, Dates     │
│  - Internal fields   │                        │  - ONLY public cols │
└─────────────────────┘                        └─────────────────────┘
                                                        │
                                                        │ Google Sheets
                                                        │ CSV/JSON export
                                                        │ or published URL
                                                        ▼
                                                ┌─────────────────────┐
                                                │  Website (GitHub    │
                                                │  Pages — static)    │
                                                │  - JS fetches data  │
                                                │    from Sheet 3     │
                                                │  - Renders courses  │
                                                │  - Booking form     │
                                                │    POSTs to doPost  │
                                                └─────────────────────┘
```

### 3.1 Set up IMPORTRANGE from Sheet 4 → Sheet 3
- [ ] Sheet 3 should pull from Sheet 4 Kursplanung using IMPORTRANGE
- Formula for Sheet 3 cell A2 (or wherever data starts):
  ```
  =IMPORTRANGE("1fzXqhX-6B04Q-BMf0QNC3OWyGjIbU-CaqTLb3SwMHPU", "'🧘 Kursplanung'!B4:V")
  ```
- Filter to only show rows where Website?=YES (col N)
- Map columns: only expose public-safe fields (Name, Price, Spots, Dates, Description, Location, Language)
- **User action**: Must click "Allow access" in Sheet 3 browser to authorize IMPORTRANGE (one-time)

### 3.2 Website reads Sheet 3 (static GitHub Pages approach)
- The website is a static GitHub Pages site — NO server-side processing
- **Option A** (current): Use Google Sheets published CSV URL
  ```
  https://docs.google.com/spreadsheets/d/SHEET3_ID/export?format=csv&gid=0
  ```
  Website JS fetches this URL, parses CSV, renders course cards
- **Option B**: Use Google Sheets API v4 (public read via API key)
  ```
  https://sheets.googleapis.com/v4/spreadsheets/SHEET3_ID/values/A:M?key=API_KEY
  ```
- **Option C**: Use the Sheet 3 doGet() Web App (currently just returns "OK")
  Could be enhanced to return JSON of public course data
  But this adds complexity — better to keep Sheet 3 script minimal

### 3.3 Confirm: Apps Script on Sheet 4 does NOT need to interact with Sheet 3
- ✅ **Correct** — Sheet 4 Apps Script should NOT reference Sheet 3
- Sheet 3 pulls data via IMPORTRANGE (spreadsheet formula, not script)
- Website JS reads Sheet 3 directly (published CSV or API)
- Booking form on website POSTs to Sheet 4's doPost() Web App endpoint
- This separation is clean and correct

---

## Phase 4 — LOW PRIORITY IMPROVEMENTS

### 4.1 Dashboard hardcoded to 12 rows
- `buildDashboard()` loops `pi < 12` — won't show programs beyond row 15 in Kursplanung
- Fix: Make dynamic based on Kursplanung data
- **Effort**: Low

### 4.2 Session deletion is O(n²)
- `deleteSessionsForInstance()` deletes rows one-by-one bottom-up
- Fix: Collect all row indices, batch delete with `deleteRows(start, count)`
- **Effort**: Low

### 4.3 Error input validation in doPost
- If `e.postData.contents` is not valid JSON, the error is caught but could be more informative
- Add content-type check and better error messages
- **Effort**: Low

### 4.4 Add logging/monitoring tab
- No way to see if triggers are succeeding or failing without checking Apps Script logs
- Consider logging important events to a dedicated "📊 Logs" sheet tab
- **Effort**: Medium

### 4.5 autoMaintenance() every 30 minutes
- Currently runs every 30 minutes even when no new data
- Consider: only run if sheet was modified (check last-modified timestamp)
- **Effort**: Low

---

## Execution Order

| Step | Phase | Task | Blocked By |
|------|-------|------|------------|
| 1 | 0.1 | Upload .clasprc.json | User action |
| 2 | 1.x | Push fixed code to live | Step 1 |
| 3 | 0.2 | Redeploy Web App | Step 2 |
| 4 | 3.1 | Set up IMPORTRANGE Sheet 4 → Sheet 3 | Step 2 (verify data) |
| 5 | 3.2 | Verify website reads Sheet 3 correctly | Step 4 |
| 6 | 2.2 | Add LockService for race condition | — |
| 7 | 2.3 | Add duplicate booking check | — |
| 8 | 2.4 | Add email rate limiting | — |
| 9 | 2.1 | Stripe webhook signature verification | Stripe webhook secret |
| 10 | 4.x | Low priority improvements | — |

---

## Files Reference

| File | Purpose |
|------|--------|
| `/a0/usr/projects/innerevolution_website/docs/apps-script.js` | Main Apps Script source (FIXED, 1236 lines) |
| `/a0/usr/projects/innerevolution_website/docs/appsscript.json` | Apps Script manifest |
| `/a0/usr/projects/innerevolution_website/docs/.clasp.json` | clasp config (Script ID) |
| `/a0/usr/projects/innerevolution_website/docs/APPS_SCRIPT_FIX_PLAN.md` | This file |
| `/root/.clasprc.json` | OAuth credentials (MISSING — needs upload) |
