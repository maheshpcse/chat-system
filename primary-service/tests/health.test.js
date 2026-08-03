"use strict";

/**
 * CI smoke tests — no MySQL/Redis required for liveness route.
 */
const request = require("supertest");

// Minimal env so config module does not throw on import in some setups
process.env.APP_ENV = process.env.APP_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "ci-test-jwt-secret-min-32-chars-long!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "ci-test-refresh-secret-min-32-chars!";
process.env.REDIS_REQUIRED = "false";

const app = require("../src/app");

describe("Health endpoints", () => {
  it("GET /api/v1/health returns 200", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/v1/health/live returns 200", async () => {
    const res = await request(app).get("/api/v1/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("alive");
  });
});
