"""Bounded, anonymous Luk title search for Nexo's local demo.

Uses the vendored scraper's network/robots safeguards and parsers. Search parameters and
page-frame behavior follow luk-cli/api.py. No private endpoints, login, or application.
Stdout is one JSON document; fixture tests may inject a fake Fetcher into search().
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent / "luk-scraper" / "src"))

from bs4 import BeautifulSoup
from luk_scraper import config, robots
from luk_scraper.fetcher import Blocked, FetchError, Fetcher
from luk_scraper.models import utc_now_iso
from luk_scraper.parser import parse_card, parse_detail, parse_location

MAX_PAGES = 2
ENRICH_LIMIT = 8


class LayoutChanged(Exception):
    pass


def parse_page(html: str, page: int, stamp: str):
    """Exclude related/suggested cards: only actual results in the requested frame."""
    soup = BeautifulSoup(html, "html.parser")
    frame = soup.select_one(f"turbo-frame#job_offers_page_{page}:not([src])")
    modern = frame is not None
    if frame is None:
        frame = soup.select_one("turbo-frame#job_offers_results")
    count_node = soup.select_one(".job-offers-results-count")
    count_match = re.match(r"\s*([\d.]+)", count_node.get_text(" ", strip=True)) if count_node else None
    total = int(count_match[1].replace(".", "")) if count_match else None
    if frame is None:
        if page == 1 and total == 0:
            return [], False
        raise LayoutChanged("No se reconoció el listado público; no se interpretó como cero ofertas.")
    if modern:
        cards = frame.find_all("div", class_="job-offer-card", recursive=False)
        has_next = bool(frame.select("turbo-frame.job-offers-page-frame[src]"))
    else:
        cards = frame.select("div.job-offer-card")
        has_next = bool(frame.select_one('a[aria-label="Página siguiente"][href]'))
    offers = []
    for card in cards:
        offer = parse_card(card, fetched_at=stamp)
        if offer is None or not offer.title:
            raise LayoutChanged("Cambió el formato de una oferta; falta título o URL verificable.")
        # The current layout renamed span.break-words; keep the published text verbatim.
        location_node = card.select_one(".job-offer-card__location")
        if location_node:
            offer.location_text = location_node.get_text(" ", strip=True) or None
            offer.region, offer.comuna, offer.country = parse_location(offer.location_text or "")
        offers.append(offer)
    if page == 1 and total != 0 and not offers:
        raise LayoutChanged("El portal no entregó resultados reconocibles para esta búsqueda.")
    return offers, has_next


def search(query: str, fetcher=None):
    fetcher = fetcher or Fetcher(delay_s=2.0, timeout_s=15, max_retries=0)
    policy = robots.load(fetcher)
    fetcher.set_robots(policy)
    delay = policy.crawl_delay(fetcher.user_agent)
    if delay:
        fetcher.set_min_delay(delay)
    params = [("locations", "1021")]
    if query:
        params.append(("job_positions", query))
    stamp = utc_now_iso()
    offers = {}
    warnings = []
    for page in range(1, MAX_PAGES + 1):
        page_params = [*params, *(([("page", str(page))]) if page > 1 else [])]
        url = config.LIST_URL + "?" + urlencode(page_params)
        robots.ensure_allowed(policy, url, fetcher.user_agent)
        # This is the exact public frame loaded by Luk when a visitor scrolls. No arbitrary
        # frame IDs or private Turbo paths are accepted; the fixed URL is robots-checked.
        if page > 1:
            fetcher.session.headers["Turbo-Frame"] = f"job_offers_page_{page}"
        try:
            html = fetcher.get_html(config.LIST_URL, page_params)
        finally:
            fetcher.session.headers.pop("Turbo-Frame", None)
        page_offers, has_next = parse_page(html, page, stamp)
        for offer in page_offers:
            offers.setdefault(offer.slug, offer)
        if not has_next or not page_offers:
            break
        if page == MAX_PAGES:
            warnings.append("El portal tiene más resultados: esta captura se limita a sus primeras 2 páginas.")
    enriched = 0
    for offer in list(offers.values())[:ENRICH_LIMIT]:
        robots.ensure_allowed(policy, offer.url, fetcher.user_agent)
        try:
            fields = parse_detail(fetcher.get_html(offer.url))
        except Blocked:
            raise
        except FetchError:
            warnings.append("No se pudo leer el detalle de una oferta; se conserva sólo su ficha pública.")
            continue
        if not fields:
            warnings.append("Una oferta no expone detalle estructurado; no se inventaron requisitos.")
            continue
        for name, value in fields.items():
            setattr(offer, name, value)
        enriched += 1
    return {"results": [offer.to_dict() for offer in offers.values()], "captured_at": stamp,
            "stats": {"captured": len(offers), "enriched": enriched},
            "warnings": list(dict.fromkeys(warnings))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query", default="")
    args = parser.parse_args()
    query = " ".join(args.query.split())
    if len(query) > 150 or any(len(role.strip()) > 50 for role in query.split(",")):
        parser.error("Máximo 150 caracteres y 50 por cargo separado por comas.")
    try:
        result = search(query)
    except (Blocked, robots.RobotsDisallowed):
        print("Luk rechazó las solicitudes o robots.txt impide continuar. No reintentar automáticamente.", file=sys.stderr)
        return 2
    except (FetchError, LayoutChanged) as error:
        # Do not echo upstream HTML, environment variables or request headers.
        print("No se pudo consultar el listado público de Luk: " + type(error).__name__, file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
