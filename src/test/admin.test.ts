import { describe, it, expect, vi, beforeEach } from "vitest";

const calls: [string, ...unknown[]][] = [];
let response: { data: unknown; error: Error | null } = { data: null, error: null };

// Records every query-builder call and resolves with `response` when awaited.
const builder: Record<string, unknown> = {};
for (const method of ["from", "select", "insert", "update", "eq", "single", "maybeSingle"]) {
  builder[method] = (...args: unknown[]) => {
    calls.push([method, ...args]);
    return builder;
  };
}
builder.then = (resolve: (value: typeof response) => unknown) => resolve(response);

vi.mock("@/lib/supabase", () => ({ supabase: builder }));

const { validateProgram, saveProgram, setPublished } = await import("@/data/admin");
type ProgramInput = Parameters<typeof validateProgram>[0];

const valid: ProgramInput = {
  name: " Heat Pump Rebate ",
  category: "energy",
  programType: "Rebate Program",
  description: "Money back on heat pumps.",
  url: "https://example.org/rebate",
  howToAccess: "",
  stateCode: "IN",
  level: "state",
  isPublished: true,
};

describe("validateProgram", () => {
  it("accepts a complete program", () => {
    expect(validateProgram(valid)).toEqual({});
  });

  it("explains each problem in plain English", () => {
    expect(validateProgram({ ...valid, name: " ", url: "http://example.org", stateCode: "XX", programType: "Coupon" }))
      .toEqual({
        name: "Program name is required.",
        url: "Link must start with https://",
        stateCode: "Choose a state or territory.",
        programType: "Choose a program type from the list.",
      });
  });

  it("requires federal programs to have no state", () => {
    expect(validateProgram({ ...valid, level: "federal", stateCode: null })).toEqual({});
    expect(validateProgram({ ...valid, level: "federal" }).stateCode).toBeDefined();
  });
});

describe("saving", () => {
  beforeEach(() => {
    calls.length = 0;
    response = { data: { id: 5, name: "Heat Pump Rebate" }, error: null };
  });

  it("inserts new programs with the state name filled in from the code", async () => {
    await saveProgram(valid);
    const insert = calls.find(([m]) => m === "insert");
    expect(insert?.[1]).toMatchObject({ name: "Heat Pump Rebate", state_code: "IN", state: "Indiana" });
  });

  it("updates existing programs by id", async () => {
    await saveProgram(valid, 5);
    expect(calls.some(([m]) => m === "update")).toBe(true);
    expect(calls).toContainEqual(["eq", "id", 5]);
  });

  it("refuses to save invalid input", async () => {
    await expect(saveProgram({ ...valid, url: "example.org" })).rejects.toThrow("https://");
    expect(calls).toHaveLength(0);
  });

  it("hides programs instead of deleting them", async () => {
    await setPublished(5, false);
    expect(calls).toContainEqual(["update", { is_published: false }]);
    expect(calls).toContainEqual(["eq", "id", 5]);
  });
});
