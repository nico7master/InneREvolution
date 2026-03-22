# Google Calendar Sync Script - Syntax Guide

## Overview

The `sync_google_calendar.py` script fetches events from a public Google Calendar and generates `data/programs.json` for the InneREvolution website.

## Features

- ✅ Automatic language detection (EN/DE) from event titles/descriptions
- ✅ Extracts format (In person / Online) from descriptions
- ✅ Extracts registration URLs from descriptions
- ✅ Handles timezones (defaults to Europe/Vienna)
- ✅ Filters future events only
- ✅ Normalizes HTML descriptions to plain text

---

## Command Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--calendar-id` | ✅ Yes | - | Google Calendar ID (usually an email address) |
| `--calendar-title` | ❌ No | "InneREvolution Programs" | Calendar display title |
| `--calendar-public-url` | ❌ No | auto-generated | Public calendar URL |
| `--ics-url` | ❌ No | auto-generated | Direct ICS feed URL |
| `--ics-file` | ❌ No | - | Read from local ICS file (for testing) |
| `--timezone` | ❌ No | "Europe/Vienna" | Timezone for date parsing |
| `--output` | ❌ No | "data/programs.json" | Output JSON file path |

---

## Basic Usage

### Standard Sync (from Google Calendar)

```bash
python scripts/sync_google_calendar.py \
  --calendar-id "innerevolutionyoga.life@gmail.com" \
  --calendar-title "InneREvolution Programs" \
  --calendar-public-url "https://calendar.google.com/calendar/u/0?cid=innerevolutionyoga.life%40gmail.com" \
  --timezone "Europe/Vienna" \
  --output "data/programs.json"
```

### Short Version (minimal args)

```bash
python scripts/sync_google_calendar.py \
  --calendar-id "innerevolutionyoga.life@gmail.com"
```

### Using Direct ICS URL

```bash
python scripts/sync_google_calendar.py \
  --ics-url "https://calendar.google.com/calendar/ical/innerevolutionyoga.life%40gmail.com/public/basic.ics" \
  --output "data/programs.json"
```

### From Local ICS File (for testing)

```bash
python scripts/sync_google_calendar.py \
  --ics-file "/path/to/calendar.ics" \
  --output "data/programs.json"
```

---

## Language Detection

The script automatically detects event language from the **title** and **description**.

### How it works:

1. Combines event title + description
2. Converts to uppercase
3. Looks for keywords:

| Keywords Found | Language Assigned |
|----------------|-------------------|
| `EN`, `ENGLISH` | `"EN"` |
| `DE`, `GERMAN`, `DEUTSCH` | `"DE"` |
| None of above | `"DE"` (default) |

### Marking Events in Google Calendar

To ensure correct language detection, include one of these in your event:

**For English events:**
- Add `(EN)` or `[EN]` to the title
- Or write "English" in the description
- Example title: `Yoga Workshop (EN)`

**For German events:**
- Add `(DE)` or `[DE]` to the title
- Or write "Deutsch" in the description
- Or leave blank (defaults to DE)
- Example title: `Yoga Workshop (DE)`

---

## Event Description Format

The script parses event descriptions for additional metadata:

```
Format: In person
Registration: https://example.com/register
Description: Join us for a transformative yoga session.
Location: Vienna, Austria
```

### Supported fields:

| Field | Extracted As |
|-------|--------------|
| `Format:` | `format` (In person / Online) |
| `Registration:` | `registrationUrl` |
| `Description:` | `summary` |
| `Location:` | `location` (also from calendar field) |

---

## Output Schema

The generated `programs.json` follows this structure:

```json
{
  "meta": {
    "calendarTitle": "InneREvolution Programs",
    "calendarUrl": "https://calendar.google.com/calendar/...",
    "updatedAt": "2026-03-20T14:30:00+00:00",
    "source": "google-calendar"
  },
  "programs": [
    {
      "id": "event-uid-123",
      "title": "Yoga Workshop",
      "start": "2026-04-15T09:00:00+02:00",
      "end": "2026-04-15T11:00:00+02:00",
      "timezone": "Europe/Vienna",
      "allDay": false,
      "location": "Vienna, Austria",
      "format": "In person",
      "language": "DE",
      "summary": "Join us for a transformative yoga session.",
      "registrationUrl": "https://example.com/register",
      "calendarUrl": "https://calendar.google.com/calendar/...",
      "status": "scheduled"
    }
  ]
}
```

---

## Verification

### Check if sync succeeded:

```bash
# Check file timestamp
stat -c '%y' data/programs.json

# Count events
python3 -c "import json; d=json.load(open('data/programs.json')); print(f'Total events: {len(d.get(\"programs\", []))}')"

# List event titles with languages
python3 -c "import json; d=json.load(open('data/programs.json')); [print(f'- {p[\"title\"]} | {p.get(\"language\", \"N/A\")}') for p in d.get('programs', [])]"
```

### Pretty-print JSON:

```bash
cat data/programs.json | python3 -m json.tool
```

---

## GitHub Actions Automation

The repository includes a workflow that runs hourly (`.github/workflows/sync-programs-from-google-calendar.yml`):

- **Schedule**: Every hour via cron
- **Manual trigger**: Available via `workflow_dispatch`
- **Auto-commit**: Commits and pushes changes to `data/programs.json`

### Manual workflow trigger:

1. Go to GitHub repository → Actions tab
2. Select "Sync Programs from Google Calendar"
3. Click "Run workflow"

---

## Troubleshooting

### Script fails with "calendar not found"
- Verify `--calendar-id` is correct
- Ensure calendar is public

### Language not detected correctly
- Add explicit `(EN)` or `(DE)` to event title
- Check that keywords are in the title or description

### Events missing
- Only future events are included
- Cancelled events are filtered out
- Check event status in Google Calendar

### Timezone issues
- Default is `Europe/Vienna`
- Use `--timezone` flag to override (e.g., `--timezone "America/New_York"`)

---

## File Locations

| File | Path |
|------|------|
| Sync script | `scripts/sync_google_calendar.py` |
| Output JSON | `data/programs.json` |
| JSON Schema | `data/programs.schema.json` |
| GitHub Workflow | `.github/workflows/sync-programs-from-google-calendar.yml` |

---

## Requirements

Python packages (auto-installed in CI, manually for local dev):

```bash
pip install icalendar beautifulsoup4 requests lxml
```

Or use the system Python with standard library only (script has fallback).

---

*Last updated: 2026-03-20*
