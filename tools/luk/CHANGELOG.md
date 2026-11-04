# Changelog

## luk-cli 2.0.0 — 2026-10-21

Luk redesigned its search page on 2026-09-29 (split view, infinite scroll). Since then `luk search`
in 0.1.0 stops with `SITE_CHANGED`. 2.0.0 fixes that, uses fewer requests and tokens, and adds two
commands.

### Fixed
- **Search works again** with the new layout: results are read from `turbo-frame#job_offers_page_N`
  (the "Ya viste todas las ofertas…" suggestions are no longer counted as results), and every card
  has its **location** again (`span.job-offer-card__location`).
- **Deeper pages are polite.** A full page load now always shows page 1. Page 2 and later are fetched
  as the same lazy Turbo Frame that Luk's own page loads when you scroll: about half the bytes of a
  full page, and only as many pages as `--limit` needs. If a page adds no new offer, the walk stops
  there. Before, 15 results could cost 10 requests.
- **Suggestions work again.** Luk's home page no longer exposes an Algolia key; it now points its
  search box at its own `/flexible_search/query_suggestions`, which returns Luk's whole popular-search
  list (~2,600 entries). `luk suggest` and the suggestions in `related_roles` read that list at most
  once a day (cached) and filter it locally by word prefix, so typing costs no request. Algolia stays
  as a fallback if the endpoint disappears. `luk doctor --live` checks it as "suggestion list".
- `luk --help` no longer swallows `[mcp]` in the description of `luk mcp`.
- mypy is clean (`CLICK_ERRORS` is typed as click's exception family).

### Added
- **`luk new [WORDS]`** (MCP `new_jobs`, slash command `/luk:novedades`): shows what is new on Luk
  since your last check, and how much closed, in **one request** (the sitemap that Luk's robots.txt
  lists). It covers every live offer in every country. WORDS keep only the offers whose slug holds
  all of them; `--peek` checks without saving; `--csv` exports. The first check is a baseline: it
  lists the offers changed in the last 24 h.
- **`luk stats [ROLES] [-l PLACE]`** (MCP `job_stats`): how many offers match right now, and how many
  were published in the last 24 h, week and month, in four page-1 requests.

### Changed
- **MCP results use ~40% fewer tokens.** They leave out null and empty fields, the `url` of an item
  when it is just `https://www.takealuk.com/job_offers/<slug>`, and `posted_ago` when
  `posted_at_approx` holds the same age. A test checks a real-shape search page for at least 30%
  savings.
- The skill teaches Claude when to use `new_jobs` and `job_stats` instead of paging, and to batch
  `get_jobs` calls (rules 11–12).
- JSON contract **`schema_version` 3** (new kinds `job_stats`, `new_jobs`); see `luk-cli/docs/schema/`.
- Governance: ADR-0001 amendment (2026-10-21) on paging under Luk's new robots.txt rule.

### Known issues
- `luk-scraper` (the crawler) honours robots.txt. Since October 2026, robots.txt disallows
  `/job_offers?…page=` for crawlers, so the crawler only reads page 1 of the listing. Moving it to
  sitemap-based discovery is the next step.
