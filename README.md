# NZ Maths Year 6 — Assessment Portal

Full-stack web app for NZ Year 6 maths assessments with teacher/student accounts, automatic result submission, and curriculum tracking.

---

## Tech Stack

| Layer | Service |
|-------|---------|
| Hosting | Netlify (free tier) |
| Database & Auth | Supabase (free tier) |
| Source Control | GitHub |
| Frontend | Vanilla HTML/CSS/JS (no build step needed) |

---

## Project Structure

```
nzmaths-portal/
├── public/
│   ├── index.html          ← Landing / Login page
│   ├── student.html        ← Student portal (tests + progress)
│   └── teacher.html        ← Teacher dashboard (analytics + management)
├── netlify/
│   └── edge-functions/
│       └── create-student.js   ← Secure server-side student creation
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   ← Full DB schema
├── netlify.toml            ← Netlify config
└── .env.example            ← Environment variable template
```

---

## Step-by-Step Setup

### 1 — Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `nzmaths-portal`, choose a strong database password, region: **Southeast Asia (Singapore)** (closest to NZ)
3. Once created, go to **SQL Editor** → paste the entire contents of `supabase/migrations/001_initial_schema.sql` → **Run**
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret!)*

#### Supabase Auth Settings
- Go to **Authentication → Settings**
- Set **Site URL** to your Netlify URL (e.g. `https://nzmaths.netlify.app`)
- Under **Email**, you can disable "Confirm email" for easier student onboarding (teacher creates accounts with confirmed emails via the edge function)

---

### 2 — Add Supabase Keys to HTML Files

In each of the three HTML files, find and replace these two lines near the top of the `<script>` section:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual values from Step 1. Do this in:
- `public/index.html`
- `public/student.html`
- `public/teacher.html`

---

### 3 — GitHub Repository

```bash
# In the nzmaths-portal folder:
git init
git add .
git commit -m "Initial commit — NZ Maths Portal"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/nzmaths-portal.git
git push -u origin main
```

---

### 4 — Netlify Deployment

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Connect your GitHub account → select `nzmaths-portal`
3. Build settings:
   - **Build command**: *(leave blank — no build step needed)*
   - **Publish directory**: `public`
4. Click **Deploy site**
5. Once deployed, go to **Site Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key |

6. **Redeploy** the site after adding environment variables (Deploys → Trigger deploy)

---

### 5 — First-Time Use

#### Teacher Registration
1. Visit your Netlify URL
2. Click **New Account** → select **Teacher** → fill in name/email/password → **Create Account**
3. You'll be redirected to the Teacher Dashboard

#### Create a Class Code
1. In Teacher Dashboard → **Class Codes** → enter a class name (e.g. "Room 14")
2. Click **Generate Code** — share this code with your students

#### Student Registration (Option A — students self-register)
1. Students visit the same URL
2. Click **New Account** → select **Student** → enter name/email/password + **Class Code**
3. They're automatically linked to your class

#### Student Registration (Option B — teacher creates accounts)
1. Teacher Dashboard → **Students** → **+ Add Student**
2. Enter name, email, and a temporary password
3. Share the credentials with the student

---

## How It Works

### Student Flow
```
Login → Dashboard (see assignments) → Take a Test → Submit
         ↓
     Results auto-sent to Supabase → Teacher sees instantly
         ↓
     Student can view own Progress & Curriculum Checklist
```

### Teacher Flow
```
Login → Overview (class stats, chart, alerts)
      → Students (roster, click any student for full report)
      → All Results (filterable by student/module)
      → Assign Tests (assign modules to class or individuals)
      → Class Codes (manage join codes)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (teacher or student), linked via `teacher_id` |
| `class_codes` | Join codes teachers create for students to use at signup |
| `test_results` | Every test submission with full skill breakdown (JSONB) |
| `assigned_tests` | Teacher assignments (class-wide or individual) |

Row Level Security (RLS) ensures:
- Students only see their own results
- Teachers only see results from their own students
- Class codes are publicly readable (needed for signup validation)

---

## Making Updates

Any push to `main` on GitHub will automatically redeploy via Netlify.

```bash
# After editing files:
git add .
git commit -m "Update teacher dashboard"
git push
```

---

## Adding More Test Modules

To add a new module (e.g. Geometry):
1. Add the module to the `testBanks` object in `student.html`
2. Add the module option to the `<select>` dropdowns in `student.html` and `teacher.html`
3. Add curriculum checklist items in both `buildCurriculumChecklist()` functions
4. Add skill badge rendering in the teacher's `viewStudent()` function

---

## Troubleshooting

**Students can't sign up with class code**
→ Check the code is spelled exactly right (case-insensitive handled in JS)
→ Verify the class code exists in Supabase: Table Editor → `class_codes`

**Results not showing in teacher dashboard**
→ Check `teacher_id` is set on the student's profile row
→ In Supabase: Table Editor → `profiles` → find the student and confirm `teacher_id` matches the teacher's `id`

**"Add Student" button creates user but they don't appear in roster**
→ This uses the browser signUp method which may require email confirmation
→ For production: use the Edge Function at `/api/create-student` which bypasses email confirmation
→ Or disable email confirmation in Supabase Auth settings

**Edge Function not working**
→ Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify Environment Variables
→ Check Netlify Functions logs under: Site → Functions → create-student

---

## Free Tier Limits

| Service | Free Limit | Expected Usage |
|---------|-----------|----------------|
| Supabase DB | 500MB | Well within (text data only) |
| Supabase Auth | 50,000 MAU | Fine for a class |
| Netlify Bandwidth | 100GB/month | Fine for a school |
| Netlify Edge Functions | 3M requests/month | Fine |
