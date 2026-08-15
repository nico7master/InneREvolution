# Comprehensive SEO Plan — innerevolutionyoga.life

> Generated: 2026-08-15 | Status: In Progress

## GitHub Pages Compatibility

All items in this plan are **100% compatible** with GitHub Pages static hosting:
- `robots.txt`, `sitemap.xml`, `.nojekyll`, `404.html` → static files served as-is
- Meta tags, canonical, OG, Twitter, JSON-LD → static HTML in `<head>`
- H1 tags, alt text, semantic HTML → static HTML changes
- Image optimization → file management only
- No server-side code, no dynamic rendering required
- Only external setup: Search Console, Analytics, Google Business Profile

---

## Phase 1 — Critical Infrastructure (P0) ✅ DONE

### 1.1 Create `robots.txt` ✅
### 1.2 Create `sitemap.xml` ✅
### 1.3 Create `.nojekyll` ✅
### 1.4 Create custom `404.html` ✅

---

## Phase 2 — On-Page Meta Tags (P0) ✅ DONE

### 2.1 Meta descriptions ✅
### 2.2 Canonical URLs ✅
### 2.3 Open Graph tags ✅
### 2.4 Twitter Card tags ✅
### 2.5 `lang` attributes ✅
### 2.6 Title tag optimization ✅
### 2.7 Meta robots ✅

---

## Phase 3 — Structured Data / Schema Markup (P1) ✅ DONE

### 3.1 HealthAndBeautyBusiness + Person schema ✅
### 3.2 BreadcrumbList + Event schema ✅

---

## Phase 4 — Heading Structure & Content (P1)

### 4.1 H1 tags ✅ DONE
### 4.2 Fix heading hierarchy ⏭️ SKIPPED (user request — avoid visual risk)
### 4.3 Alt text on all images ✅ DONE (all images already had alt attributes — verified via multiline parser)

---

## Phase 5 — Performance & Core Web Vitals (P1)

### 5.1 Remove unused images ⏭️ SKIPPED (user request — keep images for future use)
### 5.2 Add preconnect / dns-prefetch hints ✅ DONE (Google Sheets API on booking page)
### 5.3 Compress remaining large images [ ] TODO (optional)

---

## Phase 6 — Technical & Crawl (P2)

### 6.1 Content-Language meta tag ✅ DONE
### 6.2 Semantic HTML improvements [ ] TODO (optional, no visual impact)

---

## Phase 7 — External Setup (P3) [ ] TODO — Requires manual action

- [ ] Google Search Console — verify domain, submit sitemap.xml
- [ ] Google Analytics 4 — install tracking code
- [ ] Google Business Profile — claim local business listing
- [ ] Bing Webmaster Tools — submit sitemap

---

## Phase 8 — Content & Keyword Strategy (P3, Ongoing) [ ] TODO

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

## Files Created/Modified

| File | Action | Phase |
|---|---|---|
| `/robots.txt` | Created | 1.1 |
| `/sitemap.xml` | Created | 1.2 |
| `/.nojekyll` | Created | 1.3 |
| `/404.html` | Created | 1.4 |
| `/index.html` | Modified — meta tags, canonical, OG, Twitter, JSON-LD, H1, lang, title, Content-Language | 2, 3, 4, 6 |
| `/de/index.html` | Modified — meta tags, canonical, OG, Twitter, JSON-LD, H1, lang, title, Content-Language | 2, 3, 4, 6 |
| `/booking/index.html` | Modified — meta tags, canonical, OG, Twitter, JSON-LD, preconnect, Content-Language | 2, 3, 5, 6 |
| `/docs/SEO_PLAN.md` | Created — this plan | — |
