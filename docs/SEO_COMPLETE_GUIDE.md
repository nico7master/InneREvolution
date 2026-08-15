# 🧘 InneREvolution Yoga — Complete SEO Guide

**Website:** innerevolutionyoga.life  
**Date:** August 2026  
**Status:** Code implementation complete — manual external steps pending

---

## Table of Contents

1. [Overview & GitHub Pages Compatibility](#1--overview--github-pages-compatibility)
2. [What Was Implemented (Code Changes)](#2--what-was-implemented-code-changes)
3. [Verification Results](#3--verification-results)
4. [Manual Setup Guide — Google Search Console](#4--manual-setup-guide--google-search-console)
5. [Manual Setup Guide — Google Analytics 4](#5--manual-setup-guide--google-analytics-4)
6. [Manual Setup Guide — Google Business Profile](#6--manual-setup-guide--google-business-profile)
7. [Manual Setup Guide — Bing Webmaster Tools](#7--manual-setup-guide--bing-webmaster-tools)
8. [What to Send Me (Codes I Can Install)](#8--what-to-send-me-codes-i-can-install)
9. [Ongoing SEO Strategy — Keywords](#9--ongoing-seo-strategy--keywords)
10. [Files Changed Summary](#10--files-changed-summary)

---

## 1. Overview & GitHub Pages Compatibility

All changes are **100% compatible** with GitHub Pages static hosting:

- `robots.txt`, `sitemap.xml`, `.nojekyll`, `404.html` → static files served as-is
- Meta tags, canonical, Open Graph, Twitter Cards, JSON-LD → static HTML in `<head>`
- H1 tags, alt text, semantic HTML → static HTML changes
- No server-side code, no dynamic rendering required
- Only external setup requires manual action: Search Console, Analytics, Google Business Profile, Bing Webmaster Tools

**Zero visual impact** — no SCSS, CSS, or JS files were modified.

---

## 2. What Was Implemented (Code Changes)

### Phase 1 — Critical Infrastructure ✅

| Item | File | Description |
|---|---|---|
| robots.txt | `/robots.txt` | Allows all crawlers, references sitemap |
| sitemap.xml | `/sitemap.xml` | 3 URLs (EN, DE, Booking) with hreflang alternates |
| .nojekyll | `/.nojekyll` | Disables Jekyll processing on GitHub Pages |
| 404 page | `/404.html` | Branded 404 with links to home & booking, `noindex` meta |

### Phase 2 — On-Page Meta Tags ✅

| Item | Pages | Details |
|---|---|---|
| Meta descriptions | All 3 | Unique EN/DE descriptions, 150-160 chars |
| Canonical URLs | All 3 | Self-referencing canonicals |
| Open Graph | All 3 | type, url, title, description, image, locale, site_name |
| Twitter Cards | All 3 | summary_large_image with title, description, image |
| lang attributes | EN/DE | `<html lang="en">` / `<html lang="de">` |
| Title optimization | All 3 | Added location keywords ("Austria" / "Österreich") |
| Meta robots | All 3 | `index, follow` on content pages, `noindex, follow` on 404 |
| Content-Language | All 3 | `<meta http-equiv="Content-Language">` |

### Phase 3 — Structured Data (JSON-LD) ✅

| Schema Type | Page | Content |
|---|---|---|
| HealthAndBeautyBusiness | EN + DE | Business name, description, URL, image, email, address (AT), Instagram |
| Person | EN + DE | Nico Schlager, jobTitle, worksFor relationship |
| BreadcrumbList | Booking | Home → Yoga Programs |
| Event | Booking | Generic program listing with organizer and location |

### Phase 4 — Heading Structure ✅

| Item | Status | Details |
|---|---|---|
| H1 tags | ✅ Done | Visually-hidden H1 on EN/DE using `.sr-only` class |
| Alt text | ✅ Done | All 97 images verified to have alt attributes |
| Heading hierarchy | ⏭️ Skipped | Avoid visual risk (quote `<h2>` → `<blockquote>` change) |

### Phase 5 — Performance ✅

| Item | Status | Details |
|---|---|---|
| Preconnect hints | ✅ Done | `preconnect` + `dns-prefetch` for Google Sheets API on booking |
| Image cleanup | ⏭️ Skipped | User wants to keep unused images for future use |
| Image compression | [ ] TODO | Optional batch optimization pass |

---

## 3. Verification Results

| Check | Result |
|---|---|
| HTML tag balance | ✅ All tags balanced across all pages |
| JSON-LD validity | ✅ All scripts valid JSON |
| SCSS/CSS changes | ✅ None — zero visual impact |
| JS changes | ✅ None — zero visual impact |
| Git commit | ✅ Committed and pushed to main |

---

## 4. Manual Setup Guide — Google Search Console

**Purpose:** Monitor how Google sees your site, submit your sitemap, track search queries and indexing status.

### Step 1 — Go to Search Console

1. Visit **https://search.google.com/search-console**
2. Sign in with your Google account (use the same one as your GitHub/email)

### Step 2 — Add Your Property

1. Click **"Add property"** (top left dropdown or sidebar)
2. Choose **"URL prefix"** (not Domain — easier for GitHub Pages)
3. Enter: `https://innerevolutionyoga.life/`
4. Click **"Continue"**

### Step 3 — Verify Ownership

1. You'll see several verification methods. Choose **"HTML tag"** (recommended — easiest)
2. Google shows you a meta tag like:
   ```html
   <meta name="google-site-verification" content="ABC123xyz..." />
   ```
3. **Copy that tag**
4. **Send me the tag** — I'll add it to your `<head>` and push it for you
5. Once deployed, go back to Search Console and click **"Verify"**
6. Wait for the "Ownership verified" message

> **Alternative:** Choose **"Google Analytics"** verification if you already have GA set up — it auto-verifies if you use the same Google account.

### Step 4 — Submit Your Sitemap

1. In Search Console, go to **"Sitemaps"** (left sidebar)
2. Enter: `sitemap.xml` (just the filename — it resolves to your full URL)
3. Click **"Submit"**
4. Check back in 1–2 days — status should change to "Success"
5. You can also click **"Test"** first to validate before submitting

### Step 5 — Monitor Indexing

1. Go to **"Coverage"** (left sidebar) — shows indexed vs excluded pages
2. Go to **"Performance"** — shows search queries, clicks, impressions, positions
3. Check **"URL Inspection"** — paste any URL to check its indexing status
4. Request indexing for specific pages if needed: paste URL → click **"Request Indexing"**

---

## 5. Manual Setup Guide — Google Analytics 4 (GA4)

**Purpose:** Track visitor behavior, traffic sources, page views, and conversions.

### Step 1 — Create a GA4 Account

1. Visit **https://analytics.google.com**
2. Sign in with your Google account
3. Click **"Start measuring"** (or Admin → Create Account if you have one)

### Step 2 — Set Up Property

1. **Account name:** `InneREvolution Yoga` (or your name)
2. **Property name:** `innerevolutionyoga.life`
3. **Reporting time zone:** `Europe/Vienna` (or your timezone)
4. **Currency:** `EUR`
5. Click **"Next"** → **"Next"** → **"Create"**

### Step 3 — Set Up Data Stream

1. Choose platform: **"Web"**
2. Enter your website URL: `https://innerevolutionyoga.life`
3. **Stream name:** `InneREvolution Website`
4. Click **"Create stream"**
5. You'll see your **Measurement ID** (format: `G-XXXXXXXXXX`)
6. **Copy this ID**

### Step 4 — Add Tracking Code to Your Website

1. **Send me your Measurement ID** (e.g. `G-ABC123XYZ9`)
2. I'll add the GA4 tracking script to all your HTML pages' `<head>` section
3. I'll commit and push — tracking starts within 24 hours

> **Or if you want to do it yourself**, add this to each page's `<head>` (before `</head>`):
> ```html
> <!-- Google Analytics 4 -->
> <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-ID-HERE"></script>
> <script>
>   window.dataLayer = window.dataLayer || [];
>   function gtag(){dataLayer.push(arguments);}
>   gtag('js', new Date());
>   gtag('config', 'G-YOUR-ID-HERE');
> </script>
> ```

### Step 5 — Verify Tracking

1. Go back to GA4 → **"Reports"** → **"Realtime"**
2. Visit your website in a browser
3. You should see 1 active user (you) within a few minutes

---

## 6. Manual Setup Guide — Google Business Profile

**Purpose:** Appear on Google Maps and in "yoga near me" local searches. This is the **most impactful** manual step for local SEO.

### Step 1 — Go to Google Business Profile

1. Visit **https://www.google.com/business**
2. Sign in with your Google account
3. Click **"Manage now"** or **"Add your business"**

### Step 2 — Enter Business Details

1. **Business name:** `InneREvolution Yoga` (or `Nico Schlager — Hatha Yoga`)
2. **Category:** Search for "Yoga instructor" or "Yoga studio" — pick the closest match
3. **Address:** Enter your real address (this is what shows on Google Maps)
   - If you teach at multiple locations, choose your primary one
   - You can add service areas later
4. **Service area:** Select cities/regions where you teach
5. **Phone:** Your business phone number
6. **Website:** `https://innerevolutionyoga.life`

### Step 3 — Verify Your Business

1. Google will ask you to verify — options vary by category:
   - **Postcard by mail** (most common) — Google mails a postcard with a code to your address (takes 5–14 days)
   - **Phone verification** — sometimes available
   - **Email verification** — sometimes available
2. Once verified, your listing goes live on Google Maps and Search

### Step 4 — Optimize Your Profile

1. **Add photos:** Upload your yoga photos, profile picture, logo
2. **Add services:** List each yoga program:
   - Yogasanas
   - Surya Kriya
   - Surya Shakti
   - Angamardana
   - Bhuta Shuddhi
   - Upa Yoga
3. **Add hours:** When you're available for teaching/consultation
4. **Add a description:** "Certified Isha Hatha Yoga teacher offering classical Hatha Yoga programs in Austria. Learn Yogasanas, Surya Kriya, Angamardana, Bhuta Shuddhi and more."
5. **Link your website:** Make sure `innerevolutionyoga.life` is listed
6. **Enable messaging:** Let people contact you directly from the listing

### Step 5 — Keep It Updated

1. Post updates about upcoming programs (Google Posts — mini announcements)
2. Respond to reviews promptly
3. Keep hours and services current

---

## 7. Manual Setup Guide — Bing Webmaster Tools

**Purpose:** Get indexed by Bing search engine and monitor Bing-specific SEO.

### Step 1 — Go to Bing Webmaster Tools

1. Visit **https://www.bing.com/webmasters**
2. Sign in with a **Microsoft account** (you can create one free if you don't have one — works with any email, including Gmail)

### Step 2 — Add Your Site

1. Click **"Add a site"**
2. Enter: `https://innerevolutionyoga.life/`
3. Click **"ADD"**

### Step 3 — Verify Ownership

1. Choose **"Meta tag"** verification (easiest for GitHub Pages)
2. Bing shows you a meta tag like:
   ```html
   <meta name="msvalidate.01" content="ABC123xyz..." />
   ```
3. **Copy that tag**
4. **Send me the tag** — I'll add it to your `<head>` and push it
5. Once deployed, go back to Bing and click **"Verify"**

### Step 4 — Submit Sitemap

1. In Bing Webmaster Tools, go to **"Sitemaps"** (left sidebar)
2. Enter: `https://innerevolutionyoga.life/sitemap.xml`
3. Click **"Submit sitemap"**
4. Wait for Bing to process (usually 1–3 days)

### Step 5 — Monitor

1. Check **"SEO Reports"** for issues Bing finds
2. Check **"Search Keywords"** to see what queries bring traffic from Bing
3. Monitor **"Crawl Information"** for errors

---

## 8. What to Send Me (Codes I Can Install)

When you've completed the steps above, send me these codes and I'll instantly add them to your website and push:

| What | Where to get it | Example |
|---|---|---|
| Google verification tag | Search Console → Add Property → HTML tag method | `<meta name="google-site-verification" content="..." />` |
| GA4 Measurement ID | Google Analytics → Admin → Data Streams | `G-XXXXXXXXXX` |
| Bing verification tag | Bing Webmaster Tools → Add Site → Meta tag | `<meta name="msvalidate.01" content="..." />` |

Once you send me any of these, I'll add them, commit, and push within minutes. The deployment to GitHub Pages happens automatically.

---

## 9. Ongoing SEO Strategy — Keywords

These keywords should be incorporated naturally into your website content over time:

| Keyword | Page | Intent |
|---|---|---|
| "Hatha Yoga Austria" | Homepage | Local search |
| "Yoga teacher Austria" | Bio section | Local + professional |
| "Yogasanas course" | Program section | Transactional |
| "Surya Kriya workshop" | Program section | Transactional |
| "Angamardana fitness" | Program section | Informational |
| "Bhuta Shuddhi purification" | Program section | Informational |
| "Classical Hatha Yoga" | Homepage | Broad informational |
| "Isha Yoga teacher" | Bio section | Brand search |

---

## 10. Files Changed Summary

### New Files Created

| File | Purpose |
|---|---|
| `/robots.txt` | Crawl directives + sitemap reference |
| `/sitemap.xml` | XML sitemap with 3 URLs + hreflang alternates |
| `/.nojekyll` | Disables Jekyll processing on GitHub Pages |
| `/404.html` | Branded 404 page with `noindex, follow` |
| `/docs/SEO_PLAN.md` | Implementation tracker (shorthand version) |
| `/docs/SEO_COMPLETE_GUIDE.md` | This document (full guide) |

### Files Modified

| File | Changes |
|---|---|
| `/index.html` | `lang="en"`, meta description, canonical, OG, Twitter, JSON-LD (Business + Person), H1, title, Content-Language, meta robots |
| `/de/index.html` | `lang="de"`, meta description (DE), canonical, OG, Twitter, JSON-LD (DE), H1 (DE), title (DE), Content-Language, meta robots |
| `/booking/index.html` | Meta description, canonical, OG, Twitter, JSON-LD (Breadcrumb + Event), preconnect, Content-Language, meta robots |

### What Was NOT Changed

| File Type | Status |
|---|---|
| SCSS files | ✅ Not touched — zero visual impact |
| CSS files | ✅ Not touched |
| JavaScript files | ✅ Not touched |
| Images | ✅ Not touched |

---

## Quick Reference — Post-Deployment Checklist

After the GitHub Pages deployment completes (1–2 minutes after push):

- [ ] Visit `https://innerevolutionyoga.life/robots.txt` — should show crawl directives
- [ ] Visit `https://innerevolutionyoga.life/sitemap.xml` — should show XML sitemap
- [ ] Visit `https://innerevolutionyoga.life/random-fake-page` — should show branded 404
- [ ] View page source on homepage — confirm meta tags, canonical, OG, JSON-LD in `<head>`
- [ ] View page source on `/de/` — confirm German meta tags and JSON-LD
- [ ] View page source on `/booking/` — confirm breadcrumb + event schema
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up Google Analytics 4
- [ ] Create Google Business Profile listing

---

*This guide was generated as part of the InneREvolution Yoga SEO implementation. For questions or updates, refer to the project repository or contact your development assistant.*
