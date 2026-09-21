import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth, DEMO_EMAIL_DOMAIN } from "@/lib/auth";

/**
 * Start a throwaway demo session.
 *
 * Better Auth has to create the account, because it signs the session cookie
 * and the browser validates that signature. A session row written straight
 * into Postgres would satisfy FastAPI while the frontend still believed it was
 * signed out.
 *
 * So: Better Auth signs the user up, we forward its Set-Cookie untouched, then
 * ask the backend to provision the account (sample database, viewer role,
 * question budget).
 */

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

function demoCredentials() {
  const id = randomBytes(9).toString("hex");
  return {
    name: "Demo user",
    email: `demo-${id}@${DEMO_EMAIL_DOMAIN}`,
    // Never shown to anyone. The account is reachable only via its session.
    password: randomBytes(24).toString("base64url"),
  };
}

export async function POST() {
  const credentials = demoCredentials();

  let signUp: Response;
  try {
    signUp = await auth.api.signUpEmail({
      body: credentials,
      asResponse: true,
    });
  } catch (error) {
    console.error("[demo] sign-up failed:", error);
    return NextResponse.json(
      { error: "Could not start the demo. Please try again." },
      { status: 500 },
    );
  }

  const setCookie = signUp.headers.get("set-cookie");
  if (!signUp.ok || !setCookie) {
    console.error("[demo] sign-up returned no session cookie", signUp.status);
    return NextResponse.json(
      { error: "Could not start the demo. Please try again." },
      { status: 500 },
    );
  }

  // The cookie value is "<token>.<signature>"; FastAPI keys off the token half.
  const token = decodeURIComponent(
    setCookie.split(";")[0].split("=").slice(1).join("="),
  ).split(".")[0];

  let provisioned: Record<string, unknown> = {};
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/demo/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[demo] provisioning failed:", res.status, await res.text());
      return NextResponse.json(
        { error: "Could not set up the demo database. Please try again." },
        { status: 502 },
      );
    }
    provisioned = await res.json();
  } catch (error) {
    console.error("[demo] provisioning request failed:", error);
    return NextResponse.json(
      { error: "Could not reach the demo backend. Please try again." },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ ok: true, ...provisioned });
  // Hand Better Auth's signed cookie to the browser unchanged.
  response.headers.set("set-cookie", setCookie);
  return response;
}
