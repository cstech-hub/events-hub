# 🎉 Campus Events Hub

An elegant, fast and minimal web portal for managing and showcasing **college events, announcements, winners, and registrations** — with a clean public interface (no student login) and a focused admin panel.

---

## 🌟 What It Does (In Plain Words)

| Section | What Visitors See | What Admins Do |
|--------|-------------------|----------------|
| **Upcoming Events** | Scrollable cards, filter by day / week / free / department. Register instantly. | Add events, set fee (or FREE), choose department or whole campus, upload a banner. |
| **Past Events** | Previous events; clicking shows event info + winners (or “Completed”). | Archive naturally by date; attach winners anytime. |
| **Announcements** | Compact horizontal feed of important notices. | Publish / edit / remove instantly. |
| **Winners** | Auto‑scroll showcase + full winners page. | Add winners (optional photo, position, class, dept). |
| **Registrations** | Students just enter info once per event. | View counts, export to Excel, verify turnout. |

---

## ✨ Highlights

- 🚀 **Fast** — No frameworks, pure ES Modules.
- 🧭 **Horizontal Tracks** — A smooth, modern homepage layout.
- 🏷 **Department Aware** — Events can be campus‑wide or scoped.
- 📝 **Zero Student Accounts** — Only admins log in.
- 🖼 **Image Support** — Event banners & winner photos (with fallbacks).
- 🌓 **Dark / Light Theme** — Remembers user preference.
- 📊 **Exports** — Download registrations (single or all) as Excel.
- 🏆 **Past Event Smartness** — Automatically shows winners if added.
- 🛡 **Admin Roles** — Permanent or temporary (expiry-aware).

---

## 🖥 Public Experience

> “Scroll. Tap. Register.”  
Visitors get immediate access:  
- One‑click dialogs (details + registration).  
- Clear badges (FREE / Paid / Department / College).  
- Winners feel like a celebration, not a spreadsheet.  

---

## 🔐 Admin Experience

A tidy side navigation with:
- **Events** – Create / edit / remove (grid or list view).
- **Announcements** – Quick broadcast posts.
- **Winners** – Attach recognitions anytime.
- **Registrations** – Live counts + export.
- **Admins** – Manage other admins (including temporary access).

---

## 🧪 Typical Flow

1. Admin adds an event with date, fee, audience, banner.
2. Students browse the Upcoming track → register instantly.
3. After the event, it shifts to Past Events automatically.
4. Admin adds winners → Past Event detail now shows the trophy zone.
5. Admin exports registrations to manage attendance or certificates.

---

## 🖌 Design Notes

- Rounded, elevated cards with subtle gradient accents.
- Scroll‑snap horizontal lanes (desktop & touch friendly).
- Consistent micro‑typography (compact, high‑density clarity).
- Fallback text & visuals (never an awkward blank).

---

## ⚡ Quick Start (High Level)

1. **Configure Supabase** (URL + anon key in `supabase.js`).
2. **Create Tables** (events, registrations, announcements, winners).
3. **Add First Admin User** (email/password + metadata).
4. **Open the Site** (any static server).
5. **Start Posting Events** — The UI does the rest.

---

## 🧭 Philosophy

> “No friction for students. No clutter for admins.”  
The Hub avoids over‑engineering: no SPA routing, no unnecessary accounts, no bloated bundles — just **clarity, speed, and consistency**.

---

## 🗂 Suggested Screenshot Sections (Add Your Own)

```
docs/screenshots/
  home-upcoming.png
  past-event-dialog.png
  winners-carousel.png
  admin-events.png
  admin-registrations.png
```

---

## 💡 Ideas You Can Add Later

- Capacity limits & seat tracking  
- Email reminders / ICS calendar buttons  
- QR check-in for onsite validation  
- Multi-tag + multi-department filters  
- Analytics dashboard (impressions vs registrations)

---

## 🙌 Credits

Built with: **Supabase** (Auth + Postgres + Storage + Edge Functions) & clean Vanilla JS.

> If this saves you time or makes your campus feel more organized — mission accomplished.

---

### 🏁 Enjoy building great events!  
Feel free to adapt, extend, or theme it your way.
