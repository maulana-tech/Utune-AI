"""
Google Places API scraper — replaces Scrapling headless browser.
Gets phone, website, address, rating directly from Google.
Free: $200/month credit (~2,000-3,000 searches).
"""
import sys
import json
import re
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse

import requests
from curl_cffi import requests as http

# ── Config ────────────────────────────────────────────────────────────────────

def _get_api_key():
    return os.environ.get('GOOGLE_MAPS_API_KEY', '')
TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', re.IGNORECASE)
# "Telp: (021) 5290 6000" — corporate sites write numbers as text far more often than tel: links.
PHONE_TEXT_RE = re.compile(r'(?:tel|telp|telepon|phone|call|hotline)\.?\s*[:.]?\s*(\+?\(?\d[\d\s().\-]{6,18}\d)', re.IGNORECASE)
TEL_RE = re.compile(r'href=["\']tel:([+\d][\d\s().\-]{6,20})["\']', re.IGNORECASE)
WA_RE = re.compile(r'(?:wa\.me/|api\.whatsapp\.com/send\?phone=|whatsapp\.com/send\?phone=)(\d{8,15})', re.IGNORECASE)

JUNK_DOMAINS = (
    'example.com', 'sentry.io', 'wixpress.com', 'w3.org',
    'schema.org', 'googleapis.com', 'gstatic.com', 'facebook.com',
    'twitter.com', 'instagram.com', 'youtube.com', 'whatsapp.com',
    'tiktok.com', 'linkedin.com', 'pngtree.com', 'localhost',
    'no-reply', 'noreply', '.png', '.jpg', '.gif', '.svg',
    'glitchtip.com', 'bugsnag.com', 'u002f',  # error-tracker DSNs / JSON-escaped slashes in page scripts
)

CONTACT_PATHS = ['/', '/contact', '/contact-us', '/kontak', '/hubungi-kami', '/en/contact', '/en/contact-us', '/id/kontak', '/about', '/about-us', '/email', '/team']

HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en;q=0.9',
}

# Scrape-wide country bias, set from argv. '' = global search (no bias).
REGION = ''
# Places API response language. Indonesian only when explicitly scraping Indonesia.
LANG = 'en'


def _site_headers():
    return {**HTTP_HEADERS, 'Accept-Language': f'{LANG};q=0.9,en;q=0.8'}


# ── Email/WhatsApp enrichment from website ─────────────────────────────────────

def _is_valid_email(email: str) -> bool:
    e = email.lower()
    return not any(j in e for j in JUNK_DOMAINS)


def _clean_phone(raw: str) -> str:
    """'(021) 850-8510 (021' -> '(021) 850-8510'; '' when too short to be a number."""
    number = re.sub(r'\s+', ' ', raw).strip()
    number = re.sub(r'\s*\(\d*$', '', number)  # regex ran into the next number's area code
    return number if len(re.sub(r'\D', '', number)) >= 8 else ''


def _normalize_wa(digits: str, dial: str) -> str:
    """wa.me / api.whatsapp.com numbers are international by spec, so they are kept
    as-is. A leading 0 means the site wrote a local number; that can only be fixed
    when we know the lead's country dial code (taken from its Google phone number).
    """
    if not digits.startswith('0'):
        return '+' + digits
    if dial:
        return '+' + dial + digits.lstrip('0')
    # ponytail: unknown country -> drop it rather than guess and store a wrong number.
    return ''


def dial_code_from_phone(intl_phone: str) -> str:
    """'+44 20 7946 0958' -> '44'. Google always puts a space after the country code."""
    if not intl_phone.startswith('+'):
        return ''
    head = intl_phone[1:].split(' ', 1)[0]
    return head if head.isdigit() else ''


CONTACT_LINK_RE = re.compile(r'href=["\']([^"\'#]*(?:contact|kontak|hubungi|tentang|about)[^"\'#]*)["\']', re.IGNORECASE)
MAX_PAGES = 8


def _get(url: str, timeout: int = 10):
    """GET that survives broken certificate chains — common on Indonesian corporate sites."""
    try:
        return http.get(url, headers=_site_headers(), timeout=timeout, impersonate='chrome')
    except Exception as e:
        if 'SSL' not in str(e) and 'certificate' not in str(e):
            raise
        return http.get(url, headers=_site_headers(), timeout=timeout, impersonate='chrome', verify=False)


def _contact_links(html: str, base: str) -> list:
    """Contact/about pages the site itself links to — beats guessing paths
    (WIKA's is /en/contact-us/business-to-business)."""
    host = urlparse(base).netloc
    links = []
    for href in CONTACT_LINK_RE.findall(html):
        full = urljoin(base + '/', href)
        if urlparse(full).netloc == host and full not in links:
            links.append(full)
    # contact pages before about pages
    return sorted(links, key=lambda l: 0 if re.search(r'contact|kontak|hubungi', l, re.I) else 1)


def enrich_from_website(url: str, dial: str = '') -> dict:
    parsed = urlparse(url if '://' in url else f'https://{url}')
    emails = set()
    whatsapp = set()
    phones = []  # ordered: first number found is usually the main line

    # Homepage first, https before http — plenty of sites listed as http:// drop plain-http connections.
    home = None
    for base in (f'https://{parsed.netloc}', f'http://{parsed.netloc}'):
        try:
            home = _get(base, timeout=15)  # slow sites (PGN) need more than a few seconds
            break
        except Exception:
            continue
    if home is None:
        return {'emails': [], 'whatsapp': [], 'phones': []}
    base = f'{urlparse(str(home.url)).scheme}://{urlparse(str(home.url)).netloc}'

    def scan(html: str):
        for m in EMAIL_RE.finditer(html):
            e = m.group(0).strip().lower()
            if _is_valid_email(e):
                emails.add(e)
        for m in WA_RE.finditer(html):
            number = _normalize_wa(m.group(1), dial)
            if number:
                whatsapp.add(number)
        text = re.sub(r'<[^>]+>', ' ', html)
        for m in [*TEL_RE.finditer(html), *PHONE_TEXT_RE.finditer(text)]:
            number = _clean_phone(m.group(1))
            if number and number not in phones:
                phones.append(number)

    html = home.text if home.status_code == 200 else ''
    scan(html)
    pages = _contact_links(html, base) + [urljoin(base, p) for p in CONTACT_PATHS[1:]]
    seen = {str(home.url).rstrip('/')}
    for page in pages:
        if (emails and (phones or whatsapp)) or len(seen) >= MAX_PAGES:
            break
        if page.rstrip('/') in seen:
            continue
        seen.add(page.rstrip('/'))
        try:
            resp = _get(page)
            if resp.status_code == 200:
                scan(resp.text)
        except Exception:
            continue

    return {'emails': sorted(emails), 'whatsapp': sorted(whatsapp), 'phones': phones[:3]}


def enrich_all_parallel(website_map: dict, timeout: int = 50) -> dict:
    """website_map: {key: (url, dial_code)} -> {key: {emails, whatsapp, phones}}.
    Sites still running at `timeout` are dropped; finished ones are kept.
    """
    results = {}
    executor = ThreadPoolExecutor(max_workers=6)
    futures = {
        executor.submit(enrich_from_website, url, dial): key
        for key, (url, dial) in website_map.items() if url
    }
    try:
        for future in as_completed(futures, timeout=timeout):
            try:
                results[futures[future]] = future.result()
            except Exception:
                pass
    except TimeoutError:
        print(f'[Warn] enrichment timed out after {timeout}s — kept {len(results)}/{len(futures)}', file=sys.stderr)
    executor.shutdown(wait=False, cancel_futures=True)
    return results


# ── Google Places API ──────────────────────────────────────────────────────────

def text_search(query: str, limit: int) -> list:
    """Search Google Places API for businesses matching query."""
    api_key = _get_api_key()
    results = []
    pagetoken = None
    retries = 0

    while len(results) < limit:
        params = {
            'query': query,
            'key': api_key,
            'language': LANG,
        }
        if REGION:
            # ccTLD bias — ranks results inside that country first. Without it the
            # search is global and ranked purely on the query text.
            params['region'] = REGION
        if pagetoken:
            params['pagetoken'] = pagetoken
            time.sleep(2)  # Google requires delay for next_page_token

        try:
            resp = requests.get(TEXT_SEARCH_URL, params=params, timeout=15)
            data = resp.json()
        except Exception as e:
            print(f'[WARN] Text search request failed: {e}', file=sys.stderr)
            break

        status = data.get('status')
        if status == 'ZERO_RESULTS':
            break
        if status != 'OK':
            message = f'Google Places {status}: {data.get("error_message", "")}'.strip()
            if not results:
                # Bad/denied key or quota on the first page is a failure, not "0 leads" —
                # exit non-zero so the job fails loudly and `auto` moves to the next source.
                print(f'[ERROR] {message}', file=sys.stderr)
                sys.exit(1)
            print(f'[WARN] {message} — keeping {len(results)} results', file=sys.stderr)
            break

        for place in data.get('results', []):
            if len(results) >= limit:
                break
            results.append(place)

        pagetoken = data.get('next_page_token')
        if not pagetoken:
            break

        retries += 1
        if retries > 10:
            break

    return results[:limit]


def get_place_details(place_id: str) -> dict:
    """Get detailed info for a place (phone, website, address, etc)."""
    api_key = _get_api_key()
    params = {
        'place_id': place_id,
        'key': api_key,
        'language': LANG,
    }

    try:
        resp = requests.get(DETAILS_URL, params=params, timeout=10)
        data = resp.json()
        if data.get('status') == 'OK':
            return data.get('result', {})
    except Exception as e:
        print(f'[WARN] Details request failed for {place_id}: {e}', file=sys.stderr)

    return {}


def format_place(place: dict, details: dict, query: str) -> dict:
    """Format a Google Place into our lead format."""
    name = place.get('name', '')
    address = place.get('formatted_address', details.get('address', ''))
    phone = details.get('formatted_phone_number') or details.get('international_phone_number') or ''
    phone_intl = details.get('international_phone_number') or ''
    website = details.get('website') or ''
    lat = place.get('geometry', {}).get('location', {}).get('lat')
    lng = place.get('geometry', {}).get('location', {}).get('lng')

    # Build maps URL
    place_id = place.get('place_id', '')
    maps_url = f'https://www.google.com/maps/place/?q=place_id:{place_id}' if place_id else ''

    # Get category from types
    types = place.get('types', []) or details.get('types', [])
    category = query
    if types:
        # Use first non- establishment type as category
        for t in types:
            if t not in ('point_of_interest', 'establishment', 'food', 'route'):
                category = t.replace('_', ' ').title()
                break

    return {
        'name': name,
        'address': address,
        'phone': phone,
        'phone_intl': phone_intl,
        'website': website,
        'maps_url': maps_url,
        'lat': lat,
        'lng': lng,
        'category': category,
        'emails': [],
        'whatsapp': [],
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def scrape_maps(query: str, limit: int, region: str = ''):
    """Main entry: search Google Places API, enrich websites for emails.

    region: ISO-3166 alpha-2 country code to bias results to ('' = global).
    """
    global REGION, LANG
    REGION = region
    LANG = 'id' if region == 'id' else 'en'

    api_key = _get_api_key()
    if not api_key:
        # Non-zero exit so the worker marks the job failed instead of "completed, 0 leads".
        print('[ERROR] GOOGLE_MAPS_API_KEY not set', file=sys.stderr)
        sys.exit(1)

    print(
        f'[Info] Searching Google Places API for "{query}" '
        f'(limit={limit}, region={region or "global"}, language={LANG})...',
        file=sys.stderr,
    )

    # Step 1: Text Search
    places = text_search(query, limit)
    print(f'[Info] Found {len(places)} places from API', file=sys.stderr)

    # Step 2: Get details for each place (phone, website, address)
    leads = []
    for place in places:
        place_id = place.get('place_id', '')
        if place_id:
            details = get_place_details(place_id)
        else:
            details = {}

        lead = format_place(place, details, query)
        leads.append(lead)

    # Step 3: Enrich websites for emails/WhatsApp (parallel)
    website_map = {
        r['name']: (r['website'], dial_code_from_phone(r.get('phone_intl', '')))
        for r in leads if r.get('website')
    }
    if website_map:
        print(f'[Info] Enriching {len(website_map)} websites for emails...', file=sys.stderr)
        enriched = enrich_all_parallel(website_map)
        for r in leads:
            data = enriched.get(r['name'], {})
            r['emails'] = data.get('emails', [])
            r['whatsapp'] = data.get('whatsapp', [])
        print(f'[Info] Email enrichment done', file=sys.stderr)

    print(json.dumps(leads[:limit]))


if __name__ == '__main__':
    query = sys.argv[1] if len(sys.argv) > 1 else 'coffee shop jakarta'
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    region = (sys.argv[3].strip().lower() if len(sys.argv) > 3 else '')
    scrape_maps(query, limit, region)
