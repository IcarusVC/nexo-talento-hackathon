import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/nexo/search-server", async (original) => ({ ...await original<typeof import("@/lib/nexo/search-server")>(), searchJobs: search }));
import { POST } from "./route";

const request = (body = JSON.stringify({ query: "analista" }), headers = {}) => new Request("http://127.0.0.1:3000/api/nexo/search", {
  method: "POST", headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json", ...headers }, body,
});

describe("local search route (mocked connector)", () => {
  beforeEach(() => { search.mockReset(); search.mockResolvedValue({ opportunities: [], source: "Get on Board" }); });

  it("accepts same-origin JSON and never caches the HTTP response", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(search).toHaveBeenCalledWith({ query: "analista", location: "" });
  });

  it("rejects foreign origin and non-local deployment before starting a capture", async () => {
    expect((await POST(request("{}", { origin: "https://outside.example" }))).status).toBe(403);
    const external = new Request("https://demo.example/api/nexo/search", { method: "POST", headers: { origin: "https://demo.example" }, body: "{}" });
    expect((await POST(external)).status).toBe(403);
    expect(search).not.toHaveBeenCalled();
  });

  it("accepts the browser's exact local Host when Next normalizes request.url to localhost", async () => {
    const normalized = new Request("http://localhost:3000/api/nexo/search", {
      method: "POST", headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000", "sec-fetch-site": "same-origin", "content-type": "application/json" },
      body: JSON.stringify({ query: "analista" }),
    });
    expect((await POST(normalized)).status).toBe(200);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("still rejects mismatched ports, missing Origin, cross-site requests and unsafe Host values", async () => {
    for (const headers of [
      { host: "127.0.0.1:3001" },
      { origin: "" },
      { "sec-fetch-site": "cross-site" },
      { host: "outside.example:3000" },
      { host: "127.0.0.1:3000@outside.example" },
      { host: "127.0.0.1:3000/private" },
      { host: "127.0.0.1:99999" },
      { host: "localhost:3000", "x-forwarded-host": "127.0.0.1:3000" },
    ]) {
      expect((await POST(request("{}", headers))).status).toBe(403);
    }
    expect(search).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON, oversized bodies and arbitrary executable fields", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("x".repeat(2049)))).status).toBe(413);
    expect((await POST(request(JSON.stringify({ query: "analista", executable: "cmd" })))).status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });
});
