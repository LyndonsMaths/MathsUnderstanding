// api/reset-student-password.js
// Vercel Serverless Function — resets a student's password via Supabase Admin API
// The service_role key stays server-side and is never exposed to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured — environment variables missing' });
  }

  const { student_id, new_password } = req.body;

  if (!student_id || !new_password) {
    return res.status(400).json({ error: 'Missing student_id or new_password' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const supaRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${student_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ password: new_password }),
  });

  const data = await supaRes.json();

  if (!supaRes.ok) {
    return res.status(400).json({ error: data.message || 'Failed to reset password' });
  }

  return res.status(200).json({ success: true });
}
