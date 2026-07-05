import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const COOKIE_NAME = "rf_session";
const MFA_COOKIE_NAME = "rf_mfa_pending";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "rentfolio-dev-secret-change-me-in-production"
);

export type Session = {
  userId: string;
  role: "LANDLORD" | "TENANT";
  name: string;
  email: string;
};

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      role: payload.role as Session["role"],
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/** Short-lived cookie marking "password verified, MFA code still needed" between login and /login/verify. */
export async function createPendingMfaSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
  const jar = await cookies();
  jar.set(MFA_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });
}

export async function getPendingMfaUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(MFA_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function clearPendingMfaSession() {
  const jar = await cookies();
  jar.delete(MFA_COOKIE_NAME);
}

/** Require a logged-in landlord; redirects to /login otherwise. */
export async function requireLandlord(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "LANDLORD") redirect("/portal");
  return session;
}

/** Require a logged-in tenant; redirects to /login otherwise. */
export async function requireTenant(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TENANT") redirect("/dashboard");
  return session;
}

export async function verifyCredentials(email: string, password: string) {
  const bcrypt = (await import("bcryptjs")).default;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function hashPassword(password: string) {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.hash(password, 10);
}
