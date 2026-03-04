"""Quick smoke test — fetches a real Quizlet URL using curl_cffi and runs the extraction logic."""
import json, re, sys
from curl_cffi import requests as cffi_requests

URL = "https://quizlet.com/898129028/chapter-11-lab-assessment-answers-flash-cards/"

def _extract_cards_from_html(html: str) -> list[dict]:
    cards = []

    # Strategy 1: __NEXT_DATA__ → studiableItems[].cardSides[]
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
    if m:
        try:
            nd = json.loads(m.group(1))
            props = nd.get("props", {}).get("pageProps", {})
            dehydrated = props.get("dehydratedReduxStateKey")
            if isinstance(dehydrated, str):
                dehydrated = json.loads(dehydrated)
            if isinstance(dehydrated, dict):
                study_data = dehydrated.get("studyModesCommon", {}).get("studiableData", {})
                items = study_data.get("studiableItems", [])
                for item in items:
                    if item.get("isDeleted"):
                        continue
                    card_sides = item.get("cardSides", [])
                    front = ""
                    back = ""
                    for side in card_sides:
                        label = side.get("label", "")
                        media = side.get("media", [])
                        text = media[0].get("plainText", "") if media else ""
                        if label == "word":
                            front = text
                        elif label == "definition":
                            back = text
                    if front or back:
                        cards.append({"front": front, "back": back})
                if cards:
                    return cards
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Strategy 2: window.Quizlet["setPageData"]
    m2 = re.search(r'window\.Quizlet\["setPageData"\]\s*=\s*({.+?});\s*</script>', html, re.DOTALL)
    if m2:
        try:
            blob = json.loads(m2.group(1))
            term_map = blob.get("termIdToTermsMap", {})
            for _id, item in term_map.items():
                word = (item.get("wordSide") or {}).get("media", [{}])
                defn = (item.get("definitionSide") or {}).get("media", [{}])
                front = word[0].get("plainText", "") if word else ""
                back  = defn[0].get("plainText", "") if defn else ""
                if front or back:
                    cards.append({"front": front, "back": back})
            if cards:
                return cards
        except (json.JSONDecodeError, KeyError):
            pass

    # Strategy 3: plainText regex fallback
    texts = re.findall(r'"plainText"\s*:\s*"((?:[^"\\]|\\.)*)"', html)
    if len(texts) >= 2:
        cleaned = [t.encode().decode("unicode_escape", errors="replace") for t in texts]
        for i in range(0, len(cleaned) - 1, 2):
            cards.append({"front": cleaned[i], "back": cleaned[i + 1]})

    return cards


print(f"Fetching {URL} ...")
resp = cffi_requests.get(URL, impersonate="chrome", timeout=15)
print(f"Status: {resp.status_code}  |  Length: {len(resp.text)} chars")

if resp.status_code != 200:
    print("FAIL — non-200 status")
    sys.exit(1)

if "px-captcha" in resp.text or "Access to this page has been denied" in resp.text:
    print("FAIL — Captcha / block page detected")
    sys.exit(1)

cards = _extract_cards_from_html(resp.text)
if not cards:
    print("FAIL — could not extract any cards from HTML")
    # dump a snippet so we can debug
    print("--- HTML snippet (first 2000 chars) ---")
    print(resp.text[:2000])
    sys.exit(1)

print(f"\nSUCCESS — extracted {len(cards)} cards\n")
for i, c in enumerate(cards[:5], 1):
    print(f"  Card {i}: {c['front'][:60]}  →  {c['back'][:60]}")
if len(cards) > 5:
    print(f"  ... and {len(cards) - 5} more")
