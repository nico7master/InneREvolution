# InneREvolution Booking System — Status & Roadmap

Last updated: 2026-04-15

---

## ✅ WORKING (as of 2026-04-15)

### Frontend (Website — innerevolutionyoga.life)
- [x] Programs load dynamically from Google Sheet 3 via Sheets API
- [x] Dates, spots, price, description, location per program
- [x] Discount code validation (from Sheet 3 Discount Codes tab)
- [x] Friends referral discount (10% × friends, max 50%)
- [x] Multi-session display per program
- [x] Terms checkbox required before submit
- [x] Booking POST to Apps Script with proper CORS handling (redirect:follow)
- [x] Real success/error feedback from API
- [x] Success screen with payment link
- [x] Deep-link: `/booking/?program=SK-2026-05-001`
- [x] Localhost dev mode with `data/sheet-cache.json`
- [x] `config.js` committed to git (not gitignored)
- [x] GitHub Actions deploy workflow working

### Backend (Apps Script v70)
- [x] Booking written to Sheet 4 📋 Buchungen tab
- [x] Duplicate booking prevention (email + programId)
- [x] LockService concurrency protection
- [x] Structured Booking ID: `BK-YYYYMMDD-HHMMSS-XXXX`
- [x] Confirmation email to customer
- [x] Stripe test payment link generated
- [x] Stripe webhook handler (marks booking Paid)
- [x] Intake form sent after payment
- [x] Payment reminders (2-day cooldown)
- [x] Friends referral verification (daily 09:00)
- [x] Calendar sync (syncSessionsToCalendar)
- [x] Daily report email
- [x] Auto-creates Stripe links on sheet edit (onEdit)
- [x] safeAlert() helper (no UI crashes from triggers)

### Active Programs
| ID | Name | Price | Spots | Date | Location |
|----|------|-------|-------|------|----------|
| SK-2026-05-001 | Surya Kriya | €250 | 10 (8 left) | 2026-05-02 | Bad Tatzmannsdorf, Reduce |
| UY-2026-05-001 | Isha Upa-yoga | €100 | 10 (10 left) | 2026-05-03 | Bad Tatzmannsdorf, Reduce |

---

## 🔴 TODO — HIGH PRIORITY

- [ ] **Switch Stripe to LIVE mode**: Script Properties → `TEST_MODE = false`
- [ ] **Set live Stripe key**: `STRIPE_SECRET_REAL = sk_live_...`
- [ ] **Set Stripe webhook secret**: `STRIPE_WEBHOOK_SECRET = whsec_...`
- [ ] **Set intake form URL**: `INTAKE_FORM_URL = https://forms.gle/...`
- [ ] **Verify confirmation email** template is correct in production
- [ ] **Add cancellation flow**: no way for customers to cancel yet

## 🟡 TODO — MEDIUM PRIORITY

- [ ] **Waiting list**: when spots = 0, offer to join waiting list
- [ ] **Booking confirmation page**: `/booking/confirmation?id=BK-...`
- [ ] **Admin dashboard**: quick view of bookings/payments/attendance
- [ ] **Auto-refresh sheet-cache.json**: trigger on Sheet 4 changes
- [ ] **Multi-language support**: booking form in EN (strings in bs() function)
- [ ] **Coupon expiry dates**: discount codes have no expiry tracking
- [ ] **Program images**: Sheet 3 has image column — website could show photos

## 🟢 TODO — NICE TO HAVE

- [ ] iCal download after booking (.ics file)
- [ ] PDF booking confirmation
- [ ] Attendance QR codes
- [ ] SMS notifications (Twilio)
- [ ] Referral tracking dashboard
- [ ] Revenue charts in Sheet 4 dashboard

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/a0/usr/projects/innerevolution_website/booking/booking.js` | Main booking form logic |
| `/a0/usr/projects/innerevolution_website/booking/config.js` | API keys & URLs (committed to git) |
| `/a0/usr/projects/innerevolution_website/data/sheet-cache.json` | Localhost dev data cache |
| `/a0/usr/projects/innerevolution_website/docs/apps-script.js` | Apps Script source (v70) |
| `/a0/usr/projects/innerevo_businesssheets/BOOKING_IMPLEMENTATION_GUIDE.md` | Full technical guide |
| `/a0/usr/projects/innerevo_businesssheets/BOOKING_SYSTEM_ANALYSIS.md` | Bug analysis from April 2026 |

## 🔧 Key URLs & IDs

| Item | Value |
|------|-------|
| Apps Script URL | `https://script.google.com/macros/s/AKfycbw3WLYvoodMPphob0cyNrny6m-JzuEV6xBZDHJXHmuDHpzprcnLASbm_s3y0JvW9vKJ/exec` |
| Apps Script Editor | `https://script.google.com/home/projects/10ha96r1KDUAi_NfHU2QZb-R_Nd_fK9pv0jTc9I90KIvn9dk4_GOAa2Ak/edit` |
| Sheet 3 (public) | `https://docs.google.com/spreadsheets/d/1hmzKORsPfch41f0J-q3w4Ybc8-vnZuGXC6FYyzbVkvU/` |
| Sheet 4 (master) | `https://docs.google.com/spreadsheets/d/1fzXqhX-6B04Q-BMf0QNC3OWyGjIbU-CaqTLb3SwMHPU/` |
| Website | `https://innerevolutionyoga.life/booking/` |
