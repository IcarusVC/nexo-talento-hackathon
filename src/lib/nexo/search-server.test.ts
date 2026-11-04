import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createSearchService, searchProcessCommand, validateSearchInput } from "./search-server";

const capturedAt = "2026-11-03T20:00:00+00:00";
const row = { title: "Analista de datos", company: "Organización", url: "https://www.takealuk.com/job_offers/analista-real",
  location_text: "Valparaíso, Chile", country: "Chile", fetched_at: capturedAt, published_at: "2026-10-30", description: "SQL y Python requeridos." };
const result = (rows = [row]) => ({ code: 0, stderr: "", stdout: JSON.stringify({ results: rows, captured_at: capturedAt,
  stats: { captured: rows.length, enriched: rows.length }, warnings: [] }) });
const input = { query: "analista", location: "" };

describe("Luk search service without network", () => {
  it("validates bounded text and rejects execution or country options", () => {
    expect(validateSearchInput({ query: " analista  datos ", location: " Chile " })).toEqual({ query: "analista datos", location: "Chile" });
    for (const invalid of [{ query: 1 }, { query: "a".repeat(151) }, { location: "a".repeat(101) },
      { command: "python", country: "US" }, [], null]) {
      expect(() => validateSearchInput(invalid)).toThrow();
    }
  });

  it("keeps shell characters inside one ordinary query argument", () => {
    const command = searchProcessCommand("analista; $(whoami)");
    expect(command.args.at(-1)).toBe("--query=analista; $(whoami)");
    expect(command.args).toContain("-I");
    expect(command.args.some((arg) => arg.endsWith("nexo-search.py"))).toBe(true);
  });

  it("preserves source, capture date, publication date and unknown requirements", async () => {
    const run = vi.fn().mockResolvedValue(result());
    const found = await createSearchService(run)(input);
    expect(found.source).toBe("Luk");
    expect(found.cacheHit).toBe(false);
    expect(found.capturedAt).toBe(capturedAt);
    expect(found.opportunities[0]).toMatchObject({ sourceUrl: row.url, observedAt: capturedAt, experienceMinYears: null });
    expect(found.opportunities[0].limits.join(" ")).toContain("2026-10-30");
    expect(found.opportunities[0].skills.map((skill) => skill.id)).toContain("sql");
    expect(found.warnings.join(" ")).not.toContain("No se consultó el portal");
  });

  it("caches for ten minutes and filters location without a new capture", async () => {
    let time = 0;
    const run = vi.fn().mockResolvedValue(result());
    const search = createSearchService(run, () => time);
    await search(input);
    time += 599_999;
    const cached = await search({ ...input, location: "valparaiso" });
    expect(cached.cacheHit).toBe(true);
    expect(cached.opportunities).toHaveLength(1);
    const none = await search({ ...input, location: "Temuco" });
    expect(none.opportunities).toHaveLength(0);
    expect(none.stats.captured).toBe(1);
    expect(none.warnings.join(" ")).toContain("filtra por texto");
    expect(run).toHaveBeenCalledTimes(1);
    time += 1;
    expect((await search(input)).cacheHit).toBe(false);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("runs one capture at a time and pauses across processes", async () => {
    let resolve!: (value: ReturnType<typeof result>) => void;
    const run = vi.fn(() => new Promise<ReturnType<typeof result>>((done) => { resolve = done; }));
    let time = 100;
    const search = createSearchService(run, () => time);
    const first = search(input);
    await expect(search({ query: "contador", location: "" })).rejects.toMatchObject({ code: "BUSY", status: 429 });
    resolve(result());
    await first;
    await expect(search({ query: "contador", location: "" })).rejects.toMatchObject({ code: "BUSY" });
    time += 2000;
    const next = search({ query: "contador", location: "" });
    resolve(result());
    await next;
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("stops after a robots/refusal result and does not recrawl another query", async () => {
    const run = vi.fn().mockResolvedValue({ code: 2, stdout: "", stderr: "blocked" });
    const search = createSearchService(run);
    await expect(search(input)).rejects.toMatchObject({ code: "SOURCE_BLOCKED" });
    await expect(search({ query: "contador", location: "" })).rejects.toMatchObject({ code: "SOURCE_BLOCKED" });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reports installation failures in Spanish without passing stderr to the UI", async () => {
    const run = vi.fn().mockResolvedValue({ code: 1, stdout: "", stderr: "ModuleNotFoundError private path" });
    await expect(createSearchService(run)(input)).rejects.toMatchObject({ code: "NOT_INSTALLED", status: 503 });
  });

  it("keeps zero results as zero and rejects malformed captures", async () => {
    const empty = await createSearchService(vi.fn().mockResolvedValue(result([])))(input);
    expect(empty.opportunities).toEqual([]);
    for (const stdout of ["not json", "null", JSON.stringify({ results: [], captured_at: "invalid" })]) {
      await expect(createSearchService(vi.fn().mockResolvedValue({ code: 0, stdout, stderr: "" }))(input))
        .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    }
  });
});

const python = path.join(process.cwd(), ".venv-luk", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
it.skipIf(!existsSync(python))("Python connector parses old/new fixtures and excludes suggested jobs (offline)", () => {
  const source = `
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('nexo_search', Path('tools/luk/nexo-search.py').resolve())
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fixtures = Path('tools/luk/luk-cli/tests/fixtures/public')
def read(name): return (fixtures / name).read_text(encoding='utf8')
rows, more = module.parse_page(read('search_infinite_recs.html'), 1, '${capturedAt}')
assert len(rows) == 2 and not more
assert rows[0].location_text == 'Providencia, Región Metropolitana'
assert all('sugerencia' not in row.slug for row in rows)
rows, more = module.parse_page(read('search_infinite_p1.html'), 1, '${capturedAt}')
assert len(rows) == 3 and more
assert rows[0].location_text == 'Las Condes, Región Metropolitana'
rows, more = module.parse_page(read('search_frame_p2.html'), 2, '${capturedAt}')
assert len(rows) > 0
rows, more = module.parse_page(read('search_analista.html'), 1, '${capturedAt}')
assert len(rows) > 0
rows, more = module.parse_page(read('search_zero.html'), 1, '${capturedAt}')
assert rows == [] and not more
try: module.parse_page('<html>Changed</html>', 1, '${capturedAt}')
except module.LayoutChanged: pass
else: raise AssertionError('Changed markup must not become zero jobs')
class FakeSession:
    def __init__(self): self.headers = {}
class FakeFetcher:
    user_agent = 'luk-scraper/1.0 (+https://example.org)'
    def __init__(self, blocked=False):
        self.session = FakeSession()
        self.calls = []
        self.blocked = blocked
        self.delay = 2
    def get_text_status(self, url):
        return (200, 'User-agent: *\\nDisallow: /job_offers\\n' if self.blocked else 'User-agent: *\\nAllow: /\\nCrawl-delay: 3\\n')
    def set_robots(self, policy): self.policy = policy
    def set_min_delay(self, delay): self.delay = max(self.delay, delay)
    def get_html(self, url, params=None):
        self.calls.append((url, params, self.session.headers.copy()))
        if url == module.config.LIST_URL:
            page = int(dict(params).get('page', '1'))
            cards = ''.join('<div class="job-offer-card" data-scroll-restore-slug="job-' + str(page) + '-' + str(i) + '"><h2 class="card-title">Analista</h2></div>' for i in range(15))
            return '<p class="job-offers-results-count">45 ofertas</p><turbo-frame id="job_offers_page_' + str(page) + '">' + cards + '<turbo-frame class="job-offers-page-frame" src="/job_offers?page=3"></turbo-frame></turbo-frame>'
        return read('detail.html')
fake = FakeFetcher()
captured = module.search('analista', fake)
assert len(captured['results']) == 30
assert captured['stats']['enriched'] == 8
assert len(fake.calls) == 10 and fake.delay == 3
assert dict(fake.calls[0][1]) == {'locations': '1021', 'job_positions': 'analista'}
assert fake.calls[1][2]['Turbo-Frame'] == 'job_offers_page_2'
assert not fake.session.headers
blocked = FakeFetcher(blocked=True)
try: module.search('analista', blocked)
except module.robots.RobotsDisallowed: pass
else: raise AssertionError('Must respect robots')
assert blocked.calls == []
print('offline parser checks passed')
`;
  // Cold Python imports can exceed Vitest's 5 s default under parallel Windows builds.
  // Bound the subprocess itself as well, so a hung connector still fails promptly.
  expect(execFileSync(python, ["-I", "-X", "utf8", "-c", source], { encoding: "utf8", timeout: 15_000 })).toContain("offline parser checks passed");
}, 20_000);
