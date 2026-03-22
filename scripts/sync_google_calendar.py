#!/usr/bin/env python3
"""Build the static programs feed from a public Google Calendar ICS feed."""

import argparse
import datetime as dt
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

URL_RE = re.compile(r'https?://[^\s<>\"]+')


def ics_unescape(value: str) -> str:
    return (
        value.replace('\\n', '\n')
        .replace('\\,', ',')
        .replace('\\;', ';')
        .replace('\\\\', '\\')
        .strip()
    )


def normalize_description(value: str) -> str:
    """Convert Google Calendar HTML descriptions into plain text lines."""
    if not value:
        return ''

    text = value.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'(?i)<\s*br\s*/?\s*>', '\n', text)
    text = re.sub(r'(?i)</\s*(p|div|pre|li|ul|ol|h[1-6])\s*>', '\n', text)
    text = re.sub(r'(?i)<\s*li[^>]*>', '- ', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\n{3,}', '\n\n', text)

    cleaned_lines = []
    for line in text.splitlines():
        normalized = re.sub(r'\s+', ' ', line).strip()
        if normalized:
            cleaned_lines.append(normalized)

    return '\n'.join(cleaned_lines).strip()


def unfold_ics(text: str) -> list[str]:
    lines = text.replace('\r\n', '\n').split('\n')
    unfolded = []
    for line in lines:
        if line.startswith((' ', '\t')) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)
    return unfolded


def parse_property(line: str):
    if ':' not in line:
        return None, {}, ''
    left, value = line.split(':', 1)
    parts = left.split(';')
    name = parts[0].upper()
    params = {}
    for part in parts[1:]:
        if '=' in part:
            key, param_value = part.split('=', 1)
            params[key.upper()] = param_value
    return name, params, ics_unescape(value)


def parse_datetime(raw_value: str, params: dict[str, str], default_timezone: str):
    raw_value = raw_value.strip()
    if not raw_value:
        return None, False, default_timezone

    is_all_day = params.get('VALUE') == 'DATE' or len(raw_value) == 8
    if is_all_day:
        date_value = dt.date(int(raw_value[0:4]), int(raw_value[4:6]), int(raw_value[6:8]))
        tz = ZoneInfo(default_timezone)
        return dt.datetime.combine(date_value, dt.time(0, 0), tz).isoformat(), True, default_timezone

    if raw_value.endswith('Z'):
        utc_value = dt.datetime.strptime(raw_value, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
        return utc_value.isoformat(), False, 'UTC'

    timezone_name = params.get('TZID', default_timezone)
    naive_value = dt.datetime.strptime(raw_value[:15], '%Y%m%dT%H%M%S')
    try:
        tz = ZoneInfo(timezone_name)
    except Exception:
        timezone_name = default_timezone
        tz = ZoneInfo(default_timezone)

    return naive_value.replace(tzinfo=tz).isoformat(), False, timezone_name


def extract_registration_url(description: str) -> str:
    for line in description.splitlines():
        lowered = line.lower().strip()
        if lowered.startswith(('registration:', 'register:', 'signup:', 'form:')):
            match = URL_RE.search(line)
            if match:
                return match.group(0)
    fallback = URL_RE.search(description)
    return fallback.group(0) if fallback else ''


def extract_format(description: str) -> str:
    for line in description.splitlines():
        lowered = line.lower().strip()
        if lowered.startswith(('format:', 'mode:')) and ':' in line:
            return line.split(':', 1)[1].strip()
    return ''


def extract_summary(description: str) -> str:
    useful_lines = []
    for line in description.splitlines():
        cleaned = line.strip()
        lowered = cleaned.lower()
        if not cleaned:
            continue
        if lowered.startswith(('registration:', 'register:', 'signup:', 'form:', 'format:', 'mode:')):
            continue
        if URL_RE.fullmatch(cleaned):
            continue
        useful_lines.append(cleaned)
    return ' '.join(useful_lines)


def fetch_ics(url: str) -> str:
    request = urllib.request.Request(url, headers={'User-Agent': 'innerevolution-calendar-sync/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode('utf-8', errors='replace')


def build_ics_url(calendar_id: str) -> str:
    encoded_id = urllib.parse.quote(calendar_id)
    return f'https://calendar.google.com/calendar/ical/{encoded_id}/public/basic.ics'


def build_calendar_url(calendar_id: str) -> str:
    encoded_id = urllib.parse.quote(calendar_id)
    return f'https://calendar.google.com/calendar/u/0?cid={encoded_id}'


def extract_language(title: str, description: str) -> str:
    """Extract language from title or description. Defaults to 'DE'."""
    text = f"{title} {description}".upper()
    if 'EN' in text or 'ENGLISH' in text:
        return 'EN'
    if 'DE' in text or 'GERMAN' in text or 'DEUTSCH' in text:
        return 'DE'
    return 'DE'  # Default to German


def parse_events(ics_text: str, default_timezone: str, fallback_calendar_url: str) -> list[dict]:
    events = []
    current = None

    for line in unfold_ics(ics_text):
        if line == 'BEGIN:VEVENT':
            current = {}
            continue
        if line == 'END:VEVENT':
            if current:
                start, all_day, timezone_name = parse_datetime(
                    current.get('DTSTART_VALUE', ''), current.get('DTSTART_PARAMS', {}), default_timezone
                )
                end = None
                if current.get('DTEND_VALUE'):
                    end, _, _ = parse_datetime(
                        current.get('DTEND_VALUE', ''), current.get('DTEND_PARAMS', {}), default_timezone
                    )

                description = normalize_description(current.get('DESCRIPTION', ''))
                program = {
                    'id': current.get('UID', current.get('SUMMARY', 'event')).replace('@google.com', ''),
                    'title': current.get('SUMMARY', 'Upcoming program'),
                    'start': start,
                    'end': end,
                    'timezone': timezone_name,
                    'allDay': all_day,
                    'location': current.get('LOCATION', ''),
                    'format': extract_format(description),
                    'summary': extract_summary(description),
                    'registrationUrl': extract_registration_url(description),
                    'language': extract_language(current.get('SUMMARY', ''), description),
                    'calendarUrl': current.get('URL', fallback_calendar_url),
                    'status': current.get('STATUS', 'scheduled').lower()
                }
                events.append(program)
            current = None
            continue

        if current is None:
            continue

        name, params, value = parse_property(line)
        if name == 'DTSTART':
            current['DTSTART_VALUE'] = value
            current['DTSTART_PARAMS'] = params
        elif name == 'DTEND':
            current['DTEND_VALUE'] = value
            current['DTEND_PARAMS'] = params
        elif name in {'UID', 'SUMMARY', 'DESCRIPTION', 'LOCATION', 'STATUS', 'URL'}:
            current[name] = value

    events.sort(key=lambda item: item.get('start') or '')
    return events


def main():
    parser = argparse.ArgumentParser(description='Generate data/programs.json from Google Calendar.')
    parser.add_argument('--calendar-id', required=True, help='Google Calendar ID, usually an email address.')
    parser.add_argument('--calendar-title', default='InneREvolution Programs')
    parser.add_argument('--calendar-public-url', default='')
    parser.add_argument('--ics-url', default='')
    parser.add_argument('--ics-file', default='', help='Read ICS from a local file for testing/debugging.')
    parser.add_argument('--timezone', default='Europe/Vienna')
    parser.add_argument('--output', default='data/programs.json')
    args = parser.parse_args()

    ics_url = args.ics_url or build_ics_url(args.calendar_id)
    calendar_url = args.calendar_public_url or build_calendar_url(args.calendar_id)

    if args.ics_file:
        ics_text = Path(args.ics_file).read_text(encoding='utf-8')
    else:
        ics_text = fetch_ics(ics_url)

    programs = parse_events(ics_text, args.timezone, calendar_url)

    payload = {
        'meta': {
            'calendarTitle': args.calendar_title,
            'calendarUrl': calendar_url,
            'updatedAt': dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            'source': 'google-calendar'
        },
        'programs': programs
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
