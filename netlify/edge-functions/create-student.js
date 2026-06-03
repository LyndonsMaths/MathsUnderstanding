// netlify/edge-functions/create-student.js
// Called by the teacher dashboard to create student accounts server-side
// Uses the Supabase service_role key (never exposed to the browser)

export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Netlify.env.toObject();

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { email, password, full_name, teacher_id } = body;
  if (!email || !password || !full_name || !teacher_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Create auth user via Admin API
  const authRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "student" },
      }),
    }
  );

  const authData = await authRes.json();
  if (!authRes.ok) {
    return new Response(JSON.stringify({ error: authData.message || "Failed to create user" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authData.id;

  // 2. Insert profile row
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: userId,
        role: "student",
        full_name,
        teacher_id,
      }),
    }
  );

  if (!profileRes.ok) {
    const err = await profileRes.text();
    return new Response(JSON.stringify({ error: "User created but profile failed: " + err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, user_id: userId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/create-student" };
