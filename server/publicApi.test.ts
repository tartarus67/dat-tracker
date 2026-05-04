import { describe, it, expect } from "vitest";

describe("Public API key validation", () => {
  it("should have PUBLIC_API_KEY configured", () => {
    const key = process.env.PUBLIC_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should reject requests without API key", async () => {
    const res = await fetch("http://localhost:3000/api/public/snapshots");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
  });

  it("should accept requests with valid API key", async () => {
    const key = process.env.PUBLIC_API_KEY;
    const res = await fetch(`http://localhost:3000/api/public/snapshots?key=${key}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dates).toBeDefined();
    expect(Array.isArray(body.dates)).toBe(true);
  });

  it("should accept API key via x-api-key header", async () => {
    const key = process.env.PUBLIC_API_KEY;
    const res = await fetch("http://localhost:3000/api/public/snapshots", {
      headers: { "x-api-key": key! },
    });
    expect(res.status).toBe(200);
  });
});
