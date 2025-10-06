# Campus Events Hub

> A modern, fast, theme‑aware web application for managing college / campus events, announcements, registrations, and winners — with a polished admin panel and a frictionless public experience (no student login required).

![Hero Preview](./docs/screenshots/hero-preview.png)

---

## ✨ Core Highlights

| Area | Features |
|------|----------|
| Public Experience | Horizontal “tracks” (Upcoming Events, Past Events, Announcements, Winners), instant registration (email only), department filters, dynamic dialogs, winners gallery |
| Events Logic | Separation of upcoming vs past, fee flag (FREE / Paid), department‑scoped or whole‑college audience, past events show winners (or “completed” fallback) |
| Admin Panel | CRUD for Events / Announcements / Winners / Registrations / Admin Users, grid & list layouts, image upload to storage, CSV/Excel export for registrations |
| Tech | Vanilla HTML/CSS/JS + Supabase (Auth / Postgres / Storage / Edge Functions), zero frameworks |
| Theming | Light / Dark persistent theme toggle |
| Resilience | Fallback aggregation if the `event_reg_counts` view is missing, defensive loaders, explicit error surfacing |
| Performance | ESM-only Supabase client import (no global), debounced searches, horizontal lazy display, minimal DOM reflow |
| Security | (Recommended) Supabase Auth for admins with metadata (`role`, `admin_type`, optional expiry) |
| Images | Winner & event banner uploads with public storage + default fallback |
| Extensibility | Clear utilities layer (`supabase.js`, `date.js`, `dom.js`) & dedicated `home.js` vs `public-main.js` split |

---

## 🗂 Project Structure (Key Files)

```
assets/
  css/
    base.css              # Public styles (cards, horizontal rows, dialogs, themes)
    admin.css             # Admin panel styles
  js/
    utils/
      supabase.js         # ESM Supabase client + data access wrapper
      date.js             # Formatting & date helpers
      dom.js              # Micro DOM helpers + skeleton utilities
    theme.js              # Theme persistence + toggle
    public-main.js        # Legacy full-page public logic (events / winners page)
    home.js               # NEW horizontal home layout logic
    auth.js               # Admin guard (Supabase Auth)
    admin/
      events.js           # Admin events CRUD + grid/list
      announcements.js
      winners.js
      registrations.js
      users.js            # Admin user management (Edge Function powered)
      common.js           # Shared admin init
pages/
  index.html              # Horizontal “tracks” homepage
  login.html
  events.html
  announcements.html
  winners.html
  my-registrations.html
  admin/...
supabase/
  functions/
    admin-users/          # Edge function for admin user management
docs/
  screenshots/            # (Place your screenshots here)
```

---

## 🛠 Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Vanilla JS (ES Modules), semantic HTML5, modern CSS |
| Backend Services | Supabase (Postgres, Auth, Storage, Edge Functions / Deno) |
| Auth (Recommended) | Supabase Email+Password (Admins only) |
| Optional Alt | Custom `admin_accounts` + RPC (if you opt out of Supabase Auth) |
| Assets | Storage buckets: `event-images`, `winner` |
| Formats | CSV / XLSX (via `xlsx` CDN) for registration export |

---

## 🚀 Quick Start

### 1. Clone & Install (no build step needed)
```bash
git clone <your-repo-url>
cd campus-events-hub
```
(Serve statically with any dev server, e.g. `npx serve .`)

### 2. Configure Supabase Client  
Open: `assets/js/utils/supabase.js`  
Update:
```js
export const SB_URL  = 'https://YOUR-PROJECT.supabase.co';
export const SB_ANON = 'YOUR_PUBLIC_ANON_KEY';
```
> This project uses **ESM import** inside `supabase.js` — do **NOT** include a separate `<script src="...supabase-js">` tag in pages.

### 3. Create Required Tables / Functions  
Run these (adapt as needed) in the Supabase SQL editor (if you haven’t already):

```sql
-- Events
create table if not exists public.events (
  id bigserial primary key,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  fee numeric default 0,
  image_url text,
  image_path text,
  registration_link text,
  delete_at timestamptz,
  audience_type text default 'college' check (audience_type in ('college','department')),
  target_department text,
  created_at timestamptz default now()
);

-- Announcements
create table if not exists public.announcements (
  id bigserial primary key,
  title text not null,
  content text,
  created_at timestamptz default now()
);

-- Winners
create table if not exists public.winners (
  id bigserial primary key,
  event_id bigint references public.events(id) on delete cascade,
  winner_name text not null,
  winner_class text,
  winner_dept text,
  position text,
  image_url text,
  image_path text,
  delete_at timestamptz,
  created_at timestamptz default now()
);

-- Registrations
create table if not exists public.registrations (
  id bigserial primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  student_email text not null,
  student_name text,
  student_class text,
  student_dept text,
  created_at timestamptz default now(),
  constraint registrations_event_email_unique unique (event_id, student_email)
);

-- View for counts (optional – code falls back if missing)
create or replace view public.event_reg_counts as
select e.id as event_id, e.title, count(r.id)::bigint as reg_count
from public.events e
left join public.registrations r on r.event_id = r.event_id
group by e.id, e.title;
```

(Adjust RLS policies to your needs. For rapid prototyping you may keep them permissive; for production lock them down.)

### 4. (Recommended) Create First Admin User (Supabase Auth)
Use Dashboard → Auth → Add user.  
Then attach metadata (SQL):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
  || jsonb_build_object('role','admin','admin_type','permanent')
where email='your_admin_email@example.com';
```

### 5. Deploy Edge Function (Admin Users)
If using the admin user management panel (create / delete admins):
```bash
supabase functions deploy admin-users --project-ref <project-ref>
```
Grant service role key in dashboard if needed (Console already sets env vars).

### 6. Serve Locally
Any static server works:
```bash
npx serve .
# then open http://localhost:3000 (or whichever port)
```

---

## 🔐 Authentication Paths

| Mode | Description |
|------|-------------|
| Primary (default) | Supabase Auth email/password only for admins |
| Student Access | Anonymous — registration form inserts rows without login |
| Temporary Admin | `admin_type='temporary'` + `admin_expires_at` (handled by guard) |
| Optional Custom (B) | A bespoke `admin_accounts` table + Edge RPC (documented earlier if needed) |

---

## 🧭 Horizontal Home Layout (home.js)

Sections (in order):
1. Upcoming Events (filter chips + dept + search; horizontal scroll & arrows)
2. Past Events (click to view, shows winners or “completed”)
3. Announcements row
4. Winners auto‑scroll carousel
5. “My Registrations” helper section

Each row uses:
- `.hrow` with **scroll-snap**
- Arrow buttons `[data-target="#rowId"]`
- Debounced search inputs
- Department select auto-populated from events

---

## 🛡 Error Resilience

| Scenario | What Happens |
|----------|--------------|
| Missing `event_reg_counts` view | Aggregates counts client-side |
| Network timeout | Clear “Failed to load” note (no endless spinner) |
| Supabase config not set | Immediate thrown error + red banner |
| Duplicate script imports | Safe single-instance client pattern |
| View or column removed | Paths guarded (try/catch + fallback message) |

---

## 🧩 Admin Panel Features

| Page | Capabilities |
|------|--------------|
| Dashboard | Shortcut links |
| Events | Create / update / delete; grid/list; upload banner; department scope; fee |
| Announcements | CRUD text-based announcements |
| Winners | Image upload (optional), ties to event, show/hide (delete_at future extension) |
| Registrations | Per-event view + Excel export (current / all) |
| Users | Edge function‑backed admin management (permanent or temporary) |

---

## 🗃 Storage Buckets

| Bucket | Purpose | Public? |
|--------|---------|---------|
| `event-images` | Event banners | Yes |
| `winner` | Winner profile images + `default-winner.png` | Yes |

Add a default winner placeholder (e.g. `default-winner.png`) to prevent broken thumbnails.

---

## 🧪 Testing Checklist

| Action | Expected |
|--------|----------|
| Load home | Horizontal rows appear, skeletons replaced |
| Filter upcoming events by dept | Only matching cards remain |
| Click past event | Dialog opens + winners section or “not published” |
| Register for event | Success message; duplicate warns appropriately |
| Export registrations | Downloads XLSX file |
| Add winner with no image | Uses fallback image |
| Theme toggle | Persists across reload (localStorage) |
| Temporary admin past expiry | Guard logs out + alert |

---

## 🐞 Troubleshooting

| Symptom | Fix |
|---------|-----|
| “supabaseUrl is required” | Using old global script – remove CDN tag & rely on ESM import inside `supabase.js` |
| Endless loader | Open console, check network errors; verify SB_URL & SB_ANON replaced |
| Images not visible | Bucket name mismatch or no public policy; re-create policy allowing SELECT |
| Duplicate registration error | Expected: Postgres unique constraint `(event_id, student_email)` |
| Winners not showing on past event detail | Ensure `event_id` in winners row matches the event + event date is in the past |

---

## 🔄 Roadmap (Suggested Next Steps)

- [ ] Role-based granular permissions (e.g., content-editor vs super-admin)
- [ ] Event capacity & seat tracking
- [ ] Multi-department (array) tags (e.g., `text[]`)
- [ ] ICS export (“Add to calendar”)
- [ ] Email notification (Edge Function / Resend / Postmark)
- [ ] Real-time channel for live winner updates
- [ ] Rate limiting registration endpoint (Edge validation)
- [ ] Accessibility audit (ARIA labeling completeness)

---

## 🤝 Contributing

1. Fork & branch: `git checkout -b feat/my-feature`
2. Make changes (add file blocks if using PR templates)
3. Lint / format (optional if you add tooling)
4. Submit PR with screenshots (especially UI changes)

---

## 🪪 License

Choose one (MIT, Apache 2.0, etc.). Example MIT:

```
MIT License © YOUR_NAME / YEAR
```

---

## 🛡 Security Notes

- Never commit the **service role** key to the repo (only the anon key lives in frontend).
- Configure Row Level Security (RLS) properly for production — current permissive policies are for development convenience.
- Use a custom domain + HTTPS always.
- Consider enabling email confirmations for admin users.

---

## 🧰 Useful Admin SQL Snippets

**Promote user to admin (permanent):**
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
  || jsonb_build_object('role','admin','admin_type','permanent')
where email='user@domain.tld';
```

**Set temporary admin (expires in 3 days):**
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object(
       'role','admin',
       'admin_type','temporary',
       'admin_expires_at', (now() + interval '3 days')::text
     )
where email='temp@domain.tld';
```

---

## 📸 Screenshots (Placeholders)

Add real images inside `docs/screenshots/` and link them here:

| Section | Screenshot |
|---------|------------|
| Home – Upcoming Row | ![Upcoming](./docs/screenshots/upcoming.png) |
| Past Event Detail | ![Past Detail](./docs/screenshots/past-detail.png) |
| Admin Events Grid | ![Admin Events](./docs/screenshots/admin-events.png) |
| Registrations Export | ![Registrations](./docs/screenshots/registrations.png) |
| Winners Carousel | ![Winners](./docs/screenshots/winners.png) |

---

## 🙋 FAQ

**Q:** Can students edit their registrations?  
**A:** Not yet – simplest flow is contact admin; you can extend with tokenized edit links.

**Q:** What happens if I delete an event with winners?  
**A:** Winners cascade-delete (ON DELETE CASCADE) to keep data clean.

**Q:** Is there pagination?  
**A:** Horizontal rows currently show all (limited by design). Add slicing + “Load More” easily in `home.js`.

---

## 🧪 Minimal Health Check Script

Open DevTools Console and run:

```js
import { sb } from './assets/js/utils/supabase.js';
const ping = await sb.from('events').select('id').limit(1);
console.log('Events ping OK:', ping);
```

If this works (no thrown error), your Supabase config and network are healthy.

---

## 🙌 Acknowledgements

- Supabase team for the excellent open stack.
- You / your college for the concept initiative.
- (Optional) Contributors list.

---

### Happy shipping! 🎉  
For enhancements or help, open an issue or PR.

