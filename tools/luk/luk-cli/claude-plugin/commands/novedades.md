---
description: Ofertas nuevas en Luk desde la última vez / What's new on Luk since my last check (read-only)
argument-hint: [palabras] [--solo-mirar]
---

Show what is new on Luk since the user's last check, following the rules of the `luk` skill.

Arguments: $ARGUMENTS

1. Read the arguments:
   - `[palabras]` (optional): words every offer slug must contain, e.g. `analista datos` →
     `match: ["analista", "datos"]` (accents optional). No words: every new offer.
   - `--solo-mirar` (optional): peek without moving the comparison point → `save: false`.
2. Call `new_jobs` with those arguments (one request: Luk's sitemap, all countries).
3. Open with the counts in one line: N nuevas (since `previous_check_at`, or "en las últimas 24 h"
   when `baseline` is true: say this was the first check and the next one compares against it),
   M cerradas, total vigentes.
4. For the newest results that look relevant to the words (at most 10), call `get_jobs` once to get
   their title, company, location and salary, and show a table: Cargo | Empresa | Ubicación | Sueldo |
   Actualizada (`lastmod`) | Link (`https://www.takealuk.com/job_offers/<slug>`), in the user's language.
   Skip `get_jobs` when the user only asked for the numbers.
5. If `has_more` is true, say how many more there are and offer to narrow with more words or to show
   the next ones. Offer `luk open <slug>` so the user applies in their browser (they click
   "Postular"). Never apply.
