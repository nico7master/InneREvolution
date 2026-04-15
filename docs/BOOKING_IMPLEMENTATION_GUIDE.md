# InneREvolution Booking System — Complete Implementation Guide

For: Website Working Agent  
Date: 2026-04-15  
Status: This guide reflects the fully debugged, working system.

---

## 1. ARCHITECTURE OVERVIEW

```
Browser (website)
  │
  ├── Reads programs from: Google Sheet 3 (public) via Sheets API
  │   Sheet ID: 1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU
  │   API Key:  AIzaSyDpF-DMxM5am0TW4vlUZDt7Y3Rv94HO_lg
  │   Tab: Programs!A3:M  (row 1=title, row 2=header, row 3+=data)
  │
  └── POSTs booking to: Google Apps Script Web App
      URL: https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec
      → Apps Script writes to Sheet 4 Buchungen tab
      → Apps Script sends confirmation email
      → Apps Script returns Stripe payment link
```

---

## 2. REQUIRED FILES

### `/booking/config.js` ← MUST be committed to git, NOT gitignored
```javascript
const CONFIG = {
  SHEET_ID:        "1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU",
  SHEETS_API_KEY:  "AIzaSyDpF-DMxM5am0TW4vlUZDt7Y3Rv94HO_lg",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec"
};
```

### `/booking/index.html` ← must load scripts in correct order
```html
<script src="config.js"></script>   <!-- FIRST - defines CONFIG -->
<script src="booking.js"></script>  <!-- SECOND - uses CONFIG -->
```

---

## 3. THE BOOKING FETCH — EXACT PATTERN (CRITICAL)

This is the ONLY pattern that works reliably for Google Apps Script from browsers:

```javascript
// ✅ CORRECT — redirect:follow, no Content-Type, parse JSON
const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
  method: 'POST',
  redirect: 'follow',          // REQUIRED: follow the 302 redirect
  body: JSON.stringify(payload), // NO Content-Type header = text/plain = simple request
});
const result = await response.json();
if (result.success) {
  // Handle success — result contains:
  // result.bookingId   = "BK-20260412-173722-XXXX"
  // result.paymentUrl  = "https://buy.stripe.com/..."
  // result.programName = "Surya Kriya"
  // result.finalPrice  = 250
} else {
  throw new Error(result.error || 'Booking failed');
}
```

### ❌ NEVER USE THESE PATTERNS:
```javascript
// ❌ WRONG — no-cors creates opaque response, can't read result
await fetch(url, { method: 'POST', mode: 'no-cors', body: ... });

// ❌ WRONG — application/json triggers CORS preflight which Apps Script doesn't handle
await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, ... });

// ❌ WRONG — without redirect:follow the 302 is not followed properly
await fetch(url, { method: 'POST', body: ... }); // missing redirect:follow
```

### Why this works:
1. `body: JSON.stringify(payload)` with NO Content-Type header → browser sends as `text/plain`
2. `text/plain` is a "simple request" → NO CORS preflight (OPTIONS) needed
3. Apps Script receives the body and processes it, returns `302` redirect
4. `302` response has `access-control-allow-origin: *`
5. Browser follows redirect to `script.googleusercontent.com`
6. Final response is JSON with CORS headers → browser can read it

---

## 4. APPS SCRIPT PAYLOAD FORMAT

The POST body must be JSON with these fields:
```json
{
  "programId":          "SK-2026-05-001",
  "programName":        "Surya Kriya",
  "basePrice":          250,
  "finalPrice":         250,
  "discountCode":       "",
  "discountPct":        0,
  "friendsDiscountPct": 0,
  "totalDiscountPct":   0,
  "fullName":           "Max Mustermann",
  "email":              "max@example.com",
  "phone":              "+43699123456",
  "bringingFriends":    false,
  "friendsCount":       "",
  "friendsNames":       "",
  "comments":           "",
  "submittedAt":        "2026-04-15T18:00:00.000Z"
}
```

**Critical**: `programId` must match the Instance ID in Sheet 4 Kursplanung column B (e.g., `SK-2026-05-001`).

---

## 5. APPS SCRIPT RESPONSE FORMAT

Success response:
```json
{
  "success": true,
  "bookingId": "BK-20260412-173722-XXXX",
  "paymentUrl": "https://buy.stripe.com/...",
  "programName": "Surya Kriya",
  "finalPrice": 250
}
```

Error response:
```json
{
  "success": false,
  "error": "Program not found or no spots available"
}
```

---

## 6. SHEET 3 PROGRAMS DATA (what browser reads)

Tab: `Programs`  
Data starts at row 3 (row 1=title, row 2=headers).  
Columns A–M:

| Col | Field | Type | Example |
|-----|-------|------|--------|
| A | ProgramID (Instance ID) | string | `SK-2026-05-001` |
| B | Name | string | `Surya Kriya` |
| C | Price | number | `250` |
| D | SpotsTotal | number | `10` |
| E | SpotsLeft | number | `8` |
| F | Active/Website | string | `Yes` |
| G | StartDate | serial number | `46157` (Google date serial) |
| H | Sessions | number | `2` |
| I | Hours/Session | number | `3` |
| J | TotalHours | number | `6` |
| K | Description | string | long text |
| L | Location | string | `Bad Tatzmannsdorf, Reduce` |
| M | Language | string | `Deutsch` |

**Important**: Fetch with `valueRenderOption=UNFORMATTED_VALUE` to get numbers, not formatted strings!

```javascript
const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Programs!A3:M` +
  `?key=${CONFIG.SHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
```

Date serial conversion (Google epoch = Dec 30, 1899):
```javascript
function serialToISO(serial) {
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}
```

---

## 7. LOCALHOST DEVELOPMENT

On `localhost` / `127.0.0.1`, the Sheets API is blocked by referrer restrictions in some cases. The booking.js handles this by loading from a local cache:

```javascript
const isLocal = location.hostname === 'localhost' || 
                location.hostname === '127.0.0.1' || 
                location.protocol === 'file:';
if (isLocal) {
  // Load from: /data/sheet-cache.json
  const resp = await fetch('../data/sheet-cache.json', { cache: 'no-store' });
  const cache = await resp.json();
  // cache.programs = array of rows
  // cache.sessions = array of rows
}
```

**`/data/sheet-cache.json` format:**
```json
{
  "programs": [
    ["SK-2026-05-001", "Surya Kriya", 250, 10, 8, "Yes", 46157, 2, 3, 6, "...", "Bad Tatzmannsdorf", "Deutsch"],
    ["UY-2026-05-001", "Isha Upa-yoga", 100, 10, 10, "Yes", 46158, 3, 1.5, 4.5, "...", "Bad Tatzmannsdorf", "Deutsch"]
  ],
  "sessions": [
    ["SK-2026-05-001", "Surya Kriya", 1, 46157, 0.75, 0.875],
    ...
  ]
}
```

The booking POST still goes to Apps Script from localhost — this works fine.

---

## 8. CURRENT ACTIVE PROGRAMS (as of 2026-04-15)

| Instance ID | Name | Price | Spots | Start Date | Location |
|-------------|------|-------|-------|-----------|----------|
| SK-2026-05-001 | Surya Kriya | €250 | 10 total, 8 left | 2026-05-02 | Bad Tatzmannsdorf, Reduce |
| UY-2026-05-001 | Isha Upa-yoga | €100 | 10 total, 10 left | 2026-05-03 | Bad Tatzmannsdorf, Reduce |

---

## 9. APPS SCRIPT WEB APP DETAILS

- **Script ID:** `10ha96r1KDUAi_NfHU2QZb-R_Nd_fK9pv0jTc9I90KIvn9dk4_GOAa2Ak`
- **Live Deployment URL:** `https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec`
- **Version:** v70 ("Complete booking system fix 2026-04-11")
- **Execute as:** Me (innerevolutionyoga.life@gmail.com)
- **Access:** Anyone
- **Source:** `/a0/usr/projects/innerevolution_website/docs/apps-script.js`

### Test it directly:
```bash
curl -sL -X POST \
  -d '{"programId":"SK-2026-05-001","fullName":"Test","email":"test@test.com","phone":"+43"}' \
  'https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec'
# Should return: {"success":true,"bookingId":"BK-...", ...}
```

---

## 10. SHEET 4 BUCHUNGEN — Where bookings are written

- **Sheet ID:** `1fzXqhX-6B04Q-BMf0QNC3OWyGjIbU-CaqTLb3SwMHPU`
- **Tab:** `📋 Buchungen`
- **Header row:** `📅 Datum | 👤 Name | 📧 Email | 📞 Telefon | 🔑 Instance ID | 📚 Kursname | 🏷️ Rabattcode | ...`

Each successful booking creates a new row here.

---

## 11. GITHUB SECRETS (used by deploy workflow)

| Secret | Value |
|--------|-------|
| `SHEET_ID` | `1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU` |
| `SHEETS_API_KEY` | `AIzaSyDpF-DMxM5am0TW4vlUZDt7Y3Rv94HO_lg` |
| `APPS_SCRIPT_URL` | The v70 deployment URL above |

**Note:** `config.js` is committed directly to git (not generated from secrets) because these values are visible in the browser anyway.

---

## 12. DEBUGGING CHECKLIST

If booking doesn't work, check in order:

### Step 1: Does config.js load?
```javascript
// Browser console:
console.log(typeof CONFIG, CONFIG?.APPS_SCRIPT_URL?.substring(0, 50));
// Expected: "object" "https://script.google.com/macros/s/AKfycbw3W..."
```

### Step 2: Do programs load?
```javascript
// Browser console after page loads:
console.log(window.programs);
// Expected: array with 2+ objects, each with .id, .name, .price
```

### Step 3: Does the POST reach Apps Script?
```javascript
// Paste in browser console to test directly:
fetch('https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec', {
  method: 'POST',
  redirect: 'follow',
  body: JSON.stringify({programId:'SK-2026-05-001',fullName:'Test',email:'test@test.com',phone:'+43'})
}).then(r => r.json()).then(d => console.log(d));
// Expected: {success: true, bookingId: "BK-...", paymentUrl: "https://...", ...}
```

### Step 4: Check Sheet 4 Buchungen
Open https://docs.google.com/spreadsheets/d/1fzXqhX-6B04Q-BMf0QNC3OWyGjIbU-CaqTLb3SwMHPU/
Tab: 📋 Buchungen — new booking should appear here.

---

## 13. KNOWN ISSUES & STRIPE TEST MODE

Currently in **Stripe test mode** — Stripe links are test links (`buy.stripe.com/test_...`).

To switch to live payments:
1. Open Apps Script editor
2. Project Settings → Script Properties
3. Set `TEST_MODE` = `false`

---

## 14. COMPLETE BOOKING FLOW (for reference)

```
1. Page loads → booking.js fetches Programs, Sessions, Discount Codes from Sheet 3
2. User selects program → form populates with price, dates, location
3. User fills name/email/phone, applies discount code (optional)
4. User clicks Register
5. booking.js builds payload JSON
6. fetch POST to Apps Script URL (text/plain, redirect:follow)
7. Apps Script:
   a. LockService.getScriptLock() — prevents race conditions
   b. Parse payload (e.postData.contents → JSON.parse)
   c. Check duplicate booking (email + programId)
   d. Find program row in Kursplanung (by Instance ID = col B)
   e. Check spotsLeft > 0
   f. Write booking row to Buchungen tab
   g. Send confirmation email
   h. Create/return Stripe payment link
   i. Unlock
8. Browser receives {success:true, bookingId, paymentUrl, ...}
9. booking.js shows success screen
10. User clicks Stripe link → pays
11. Stripe webhook fires → Apps Script marks booking as Paid
```
