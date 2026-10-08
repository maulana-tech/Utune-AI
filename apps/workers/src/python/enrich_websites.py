"""Find emails / WhatsApp / phone numbers on business websites.

stdin:  JSON [{"key": "...", "url": "https://...", "phone": "+62 21 ..."}]
stdout: JSON {"<key>": {"emails": [...], "whatsapp": [...], "phones": [...]}}

Used by the scrape worker for sources that return a website but no contacts
(Wikidata, Apollo, OSM, ...). Reuses the Places scraper's crawler.
"""
import json
import sys

from places_scraper import dial_code_from_phone, enrich_all_parallel

if __name__ == '__main__':
    items = json.load(sys.stdin)
    website_map = {
        str(i['key']): (i['url'], dial_code_from_phone(i.get('phone') or ''))
        for i in items if i.get('url')
    }
    timeout = int(sys.argv[1]) if len(sys.argv) > 1 else 240
    print(json.dumps(enrich_all_parallel(website_map, timeout)))
