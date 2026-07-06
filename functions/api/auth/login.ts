import { verifyPassword, createSession, setSessionCookie, type Env } from "../../lib/auth";
import { rateLimit, getClientIp } from "../../lib/rateLimit";

interface LoginBody {
  email?: string;
  password?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const ip = getClientIp(request);
  if (!(await rateLimit(env.RATE_LIMIT_KV, `login:${ip}`))) {
    return new Response(
      JSON.stringify({ error: "Demasiados intentos. Espera un poco y vuelve a intentarlo." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, display_name, needs_username_setup FROM users WHERE email = ?"
  )
    .bind(email)
    .first<{
      id: number;
      email: string;
      password_hash: string | null;
      display_name: string;
      needs_username_setup: number;
    }>();

  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = await createSession(env.DB, user.id);
  const secure = new URL(request.url).protocol === "https:";

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        needs_username_setup: user.needs_username_setup === 1,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setSessionCookie(sessionId, secure),
      },
    }
  );
};
