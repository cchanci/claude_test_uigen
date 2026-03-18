// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

async function makeToken(payload: object, expiresIn = "7d") {
  const { SignJWT } = await import("jose");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

describe("createSession", () => {
  test("sets an httpOnly cookie with a signed JWT", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");

    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("test@example.com");
  });

  test("sets cookie expiry 7 days from now", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresMs = options.expires.getTime();

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDays);
  });

  test("sets sameSite lax and is not secure in non-production", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "test@example.com", expiresAt: new Date() });
    mockCookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    const result = await getSession();
    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
  });

  test("returns null for a tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "test@example.com" }, "-1s");
    mockCookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });
});
