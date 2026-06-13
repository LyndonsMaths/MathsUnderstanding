// api/create-student.js
// Vercel Serverless Function — creates a student account via Supabase Admin API
// Uses the service_role key so email confirmation is bypassed automatically.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured — environment variables missing' });
  }

  const { email, password, full_name, teacher_id } = req.body;

  if (!email || !password || !full_name || !teacher_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Create auth user via Admin API (bypasses email confirmation)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,  // mark as confirmed so they can log in immediately
      user_metadata: { full_name, role: 'student' },
    }),
  });

  const userData = await createRes.json();

  if (!createRes.ok) {
    return res.status(400).json({ error: userData.message || 'Failed to create auth user' });
  }

  // Insert profile row with teacher link
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: userData.id,
      role: 'student',
      full_name,
      teacher_id,
      must_change_password: true,
    }),
  });

  if (!profileRes.ok) {
    const profileErr = await profileRes.json().catch(() => ({}));
    return res.status(400).json({ error: profileErr.message || 'User created but profile insert failed' });
  }

  return res.status(200).json({ success: true, user_id: userData.id });
}
