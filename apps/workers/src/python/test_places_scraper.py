"""Pure-logic checks for the scraper's phone/WhatsApp normalization.

Run: python3 apps/workers/src/python/test_places_scraper.py
Network deps are stubbed so this runs without the venv.
"""
import sys
import types

for mod in ('curl_cffi', 'requests'):
    sys.modules.setdefault(mod, types.ModuleType(mod))
sys.modules['curl_cffi'].requests = types.ModuleType('requests')
sys.path.insert(0, __file__.rsplit('/', 1)[0])

import places_scraper as p


def test_dial_code_from_phone():
    assert p.dial_code_from_phone('+44 20 7946 0958') == '44'
    assert p.dial_code_from_phone('+62 812-3456-7890') == '62'
    assert p.dial_code_from_phone('+1 212-555-1234') == '1'
    assert p.dial_code_from_phone('020 7946 0958') == ''
    assert p.dial_code_from_phone('') == ''


def test_normalize_wa():
    # wa.me numbers are already international — keep them, whatever the country
    assert p._normalize_wa('447911123456', '') == '+447911123456'
    assert p._normalize_wa('6281234567890', '62') == '+6281234567890'
    # local format written on the site: fixable only with the lead's dial code
    assert p._normalize_wa('081234567890', '62') == '+6281234567890'
    assert p._normalize_wa('02079460958', '44') == '+442079460958'
    # unknown country -> dropped, never guessed as +62
    assert p._normalize_wa('02079460958', '') == ''


def test_language_follows_region():
    """Indonesian responses only when explicitly scraping Indonesia; English otherwise.

    scrape_maps sets the globals before it needs an API key, so it returns early here.
    """
    import io
    import contextlib

    for region, lang in [('id', 'id'), ('gb', 'en'), ('', 'en')]:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            p.scrape_maps('coffee shop', 1, region)
        assert p.LANG == lang, f'{region} -> {p.LANG}'
        assert p.REGION == region


if __name__ == '__main__':
    test_dial_code_from_phone()
    test_normalize_wa()
    test_language_follows_region()
    print('all ok')
