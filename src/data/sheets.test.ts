import { describe, it, expect } from "vitest";
import { normalizeBaseUrl } from "@/data/sheets";

describe("normalizeBaseUrl", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(normalizeBaseUrl("eloify.eloifyapp.workers.dev")).toBe(
      "https://eloify.eloifyapp.workers.dev",
    );
  });

  it("keeps an existing scheme", () => {
    expect(normalizeBaseUrl("https://x.workers.dev")).toBe("https://x.workers.dev");
    expect(normalizeBaseUrl("http://localhost:8787")).toBe("http://localhost:8787");
  });

  it("trims whitespace and trailing slashes", () => {
    expect(normalizeBaseUrl("  eloify.eloifyapp.workers.dev/  ")).toBe(
      "https://eloify.eloifyapp.workers.dev",
    );
    expect(normalizeBaseUrl("https://x.workers.dev///")).toBe("https://x.workers.dev");
  });

  it("leaves an empty string empty", () => {
    expect(normalizeBaseUrl("")).toBe("");
  });
});
