import { describe, it, expect, vi, beforeEach } from "vitest";

const calls: [string, ...unknown[]][] = [];
let response: { data: unknown[] | null; error: Error | null } = { data: [], error: null };

// Records every query-builder call and resolves with `response` when awaited.
const builder: Record<string, unknown> = {};
for (const method of ["from", "select", "order", "range", "eq", "in", "textSearch"]) {
  builder[method] = (...args: unknown[]) => {
    calls.push([method, ...args]);
    return builder;
  };
}
builder.then = (resolve: (value: typeof response) => unknown) => resolve(response);

vi.mock("@/lib/supabase", () => ({ supabase: builder }));

const { fetchPrograms } = await import("@/data/programs");

const row = {
  id: 7,
  name: "Heat Pump Rebate",
  category: "energy",
  description: "Money back on heat pumps.",
  url: "https://example.org",
  how_to_access: "See link below.",
  state: "Washington D.C.",
  state_code: "DC",
  level: "territory",
};

describe("fetchPrograms", () => {
  beforeEach(() => {
    calls.length = 0;
    response = { data: [row], error: null };
    localStorage.clear();
  });

  it("maps database rows to Program objects", async () => {
    expect(await fetchPrograms()).toEqual([
      {
        id: "7",
        name: "Heat Pump Rebate",
        category: "energy",
        description: "Money back on heat pumps.",
        url: "https://example.org",
        details: "See link below.",
        state: "Washington D.C.",
        stateCode: "DC",
        level: "territory",
      },
    ]);
    expect(calls).toContainEqual(["from", "programs"]);
  });

  it("applies filters in the database query", async () => {
    await fetchPrograms({ stateCode: "dc", levels: ["state", "territory"], category: "energy", search: " heat pump " });
    expect(calls).toContainEqual(["eq", "state_code", "DC"]);
    expect(calls).toContainEqual(["in", "level", ["state", "territory"]]);
    expect(calls).toContainEqual(["eq", "category", "energy"]);
    expect(calls).toContainEqual(["textSearch", "search", "heat pump", { type: "websearch", config: "english" }]);
  });

  it("falls back to the cache for the same filters when the request fails", async () => {
    await fetchPrograms({ stateCode: "DC" });
    response = { data: null, error: new Error("offline") };

    expect(await fetchPrograms({ stateCode: "DC" })).toHaveLength(1);
    await expect(fetchPrograms({ stateCode: "CA" })).rejects.toThrow("offline");
  });
});
