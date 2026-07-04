import { hashPassword, createSession, setSessionCookie, type Env } from "../../lib/auth";
import { rateLimit, getClientIp } from "../../lib/rateLimit";

interface RegisterBody {
  email?: string;
  password?: string;
  display_name?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const ip = getClientIp(request);
  if (!(await rateLimit(env.RATE_LIMIT_KV, `register:${ip}`))) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RegisterBody;
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
  const displayName = body.display_name?.trim() ?? "";

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!password || password.length < 8) {
    return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return new Response(JSON.stringify({ error: "Email already registered" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const passwordHash = await hashPassword(password);

  const insertResult = await env.DB.prepare(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
  )
    .bind(email, passwordHash, displayName)
    .run();

  const userId = insertResult.meta.last_row_id;

  const sessionId = await createSession(env.DB, userId);
  const secure = new URL(request.url).protocol === "https:";

  return new Response(
    JSON.stringify({ user: { id: userId, email, display_name: displayName } }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setSessionCookie(sessionId, secure),
      },
    }
  );
};
