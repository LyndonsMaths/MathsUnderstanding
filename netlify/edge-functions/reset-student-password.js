// netlify/edge-functions/reset-student-password.js
// Resets a student's password using the Supabase Admin API (service_role key)
// Called by the teacher dashboard — never exposes the service key to the browser

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Netlify.env.toObject();

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { student_id, new_password } = body;
  if (!student_id || !new_password) {
    return new Response(JSON.stringify({ error: 'Missing student_id or new_password' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (new_password.length < 8) {
    return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Reset via Supabase Admin API
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${student_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ password: new_password }),
  });

  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message || 'Failed to reset password' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/reset-student-password' };
