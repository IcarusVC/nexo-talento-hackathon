import { describe, expect, it, vi } from "vitest";
import { adaptGetOnBoard, publicText } from "./getonboard-adapter";
import { createPublicSearchService } from "./search-server";

const stamp = "2026-11-03T22:00:00.000Z";
function job(overrides: Record<string, unknown> = {}) {
  return { id: "analista-datos-compania-santiago", type: "job", links: { public_url: "https://www.getonbrd.com/jobs/analista-datos-compania-santiago" },
    attributes: { title: "Analista de datos", description: "<p>Se requieren SQL y Python.</p><p>Al menos 3 años de experiencia.</p>",
      functions: "<p>Construir análisis de datos.</p>", desirable: "<p>Inglés</p>", countries: ["Chile"], remote_modality: "hybrid",
      min_salary: 1700, max_salary: 2200, published_at: 1793133968, category_name: "Data Science / Analytics",
      company: { data: { attributes: { name: "Compañía" } } },
      location_cities: { data: [{ attributes: { name: "Santiago", country: "Chile" } }] },
      modality: { data: { attributes: { name: "Full time", locale_key: "full_time" } } },
      seniority: { data: { attributes: { name: "Semi Senior", locale_key: "semi_senior" } } }, ...overrides } };
}
const payload = () => ({ data: [job()], meta: { page: 1, per_page: 30, total_pages: 9 } });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const input = { query: "python", location: "" };

describe("official Get on Board adapter", () => {
  it("preserves source, source publication time, extraction time and explicit seniority", () => {
    const output = adaptGetOnBoard(payload(), stamp);
    const o = output.opportunities[0];
    expect(o.id).toMatch(/^getonboard-/);
    expect(o.sourceUrl).toBe(job().links.public_url);
    expect(o.observedAt).toBe(stamp);
    expect(o.limits.join(" ")).toContain(new Date(1793133968 * 1000).toISOString());
    expect(o).toMatchObject({ company: "Compañía", country: "Chile", location: "Santiago, Chile", seniority: "mid", experienceMinYears: 3 });
    expect(o.skills.find((skill) => skill.id === "english")?.level).toBe("preferred");
    expect(o.hoursPerWeek).toBeNull();
    expect(o.scheduleText).toBe("Full time · Híbrido");
    expect(o.limits.filter((limit) => limit.startsWith("Publicación declarada:"))).toEqual([`Publicación declarada: ${new Date(1793133968 * 1000).toISOString()}.`]);
  });

  it.each([
    ["Programación", "computacion"], ["Programming", "computacion"],
    ["Machine Learning / AI", "computacion"], ["Data Science / Analytics", "computacion"],
    ["Accounting", "contabilidad"], ["Contabilidad / Auditoría", "contabilidad"],
    ["Business", "comercial"], ["Business Development", "comercial"],
    ["Customer Support", "general"], ["Medicine", "general"], ["Unknown", "general"], ["", "general"],
  ])("maps only direct published category %s to %s", (category, field) => {
    const output = adaptGetOnBoard({ data: [job({ category_name: category, title: "Cargo con SQL y comunicación", description: "Trabajo en equipo y comunicación requeridos." })] }, stamp);
    expect(output.opportunities[0].field).toBe(field);
  });

  it("keeps remote restrictions visible and does not invent a publication date", () => {
    const o = adaptGetOnBoard({ data: [job({ remote_modality: "remote_local", published_at: null })] }, stamp).opportunities[0];
    expect(o.scheduleText).toContain("Remoto con restricciones territoriales");
    expect(o.limits.some((limit) => limit.startsWith("Publicación declarada:"))).toBe(false);
    expect(o.observedAt).toBe(stamp);
  });

  it("does not invent a salary period, convert USD, or numerically compare an ambiguous range", () => {
    const o = adaptGetOnBoard(payload(), stamp).opportunities[0];
    expect(o.remuneration).toContain("USD 1700–2200");
    expect(o.remuneration).toContain("período y bruto/líquido por confirmar");
    expect(o.salary).toBeUndefined();
    expect(o.limits.join(" ")).toContain("conversión o redondeo");
    expect(adaptGetOnBoard({ data: [job({ min_salary: null, max_salary: null })] }, stamp).opportunities[0].remuneration).toBe("Remuneración no publicada");
    expect(adaptGetOnBoard({ data: [job({ min_salary: 3000, max_salary: 1000 })] }, stamp).opportunities[0].salary).toBeUndefined();
  });

  it("does not turn a Chile search filter into a remote candidate's eligibility", () => {
    const o = adaptGetOnBoard({ data: [job({ countries: ["Remoto"], location_cities: { data: [] }, remote_modality: "remote_local", remote_zone: "Latin America" })] }, stamp).opportunities[0];
    expect(o.country).toBe("Por confirmar");
    expect(o.location).toContain("Remoto");
    expect(o.limits.join(" ")).toContain("no confirma elegibilidad");
  });

  it("strips markup, preserves readable entities, dedupes and refuses non-provider URLs", () => {
    expect(publicText("<script>private()</script><p>A &amp; B</p><p>Espa&#241;ol</p>")).toBe("A & B\nEspañol");
    expect(adaptGetOnBoard({ data: [job(), job()] }, stamp).opportunities).toHaveLength(1);
    expect(() => adaptGetOnBoard({ data: [{ ...job(), links: { public_url: "http://127.0.0.1/private" } }] }, stamp)).toThrow();
    expect(() => adaptGetOnBoard({ error: "changed schema" }, stamp)).toThrow();
    expect(adaptGetOnBoard({ data: [] }, stamp).opportunities).toEqual([]);
  });
});

describe("Get on Board public search (mocked HTTP)", () => {
  it("makes one bounded, anonymous request to the official API and caches location refinements", async () => {
    let time = Date.parse(stamp);
    const fetcher = vi.fn().mockImplementation(async () => json(payload()));
    const search = createPublicSearchService(fetcher, () => time);
    const first = await search(input);
    expect(first.source).toBe("Get on Board");
    expect(first.stats).toEqual({ captured: 1, enriched: 1 });
    const [url, options] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://www.getonbrd.com/api/v0/search/jobs");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ query: "python", country_code: "cl", per_page: "30", page: "1" });
    expect(url.searchParams.getAll("expand[]")).toContain("company");
    expect(options).toMatchObject({ credentials: "omit", redirect: "error" });
    expect(new Headers(options.headers).has("authorization")).toBe(false);
    const cached = await search({ ...input, location: "santiago" });
    expect(cached.cacheHit).toBe(true);
    expect(cached.opportunities).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    time += 600_000;
    expect((await search(input)).cacheHit).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("honors throttling responses without retrying or calling Luk", async () => {
    let time = Date.parse(stamp);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "3600" } }));
    const search = createPublicSearchService(fetcher, () => time);
    await expect(search(input)).rejects.toMatchObject({ code: "SOURCE_BLOCKED" });
    time += 600_001;
    await expect(search({ query: "sql", location: "" })).rejects.toMatchObject({ code: "BUSY" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects/failures, invalid data, oversized data and exposes no fabricated jobs", async () => {
    const timeout = new Error("timeout"); timeout.name = "TimeoutError";
    await expect(createPublicSearchService(vi.fn().mockRejectedValue(timeout))(input)).rejects.toMatchObject({ code: "TIMEOUT", status: 504 });
    await expect(createPublicSearchService(vi.fn().mockResolvedValue(new Response("login", { status: 302 })))(input)).rejects.toMatchObject({ code: "SOURCE_UNAVAILABLE" });
    await expect(createPublicSearchService(vi.fn().mockResolvedValue(json({ data: "not a list" })))(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(createPublicSearchService(vi.fn().mockResolvedValue(json({ data: [], padding: "x".repeat(2 * 1024 * 1024) })))(input)).rejects.toMatchObject({ code: "OUTPUT_LIMIT" });
    const empty = await createPublicSearchService(vi.fn().mockResolvedValue(json({ data: [] })))(input);
    expect(empty.opportunities).toEqual([]);
  });
});
