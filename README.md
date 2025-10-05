# Events Hub

A responsive web application for browsing, registering, and managing campus events, announcements, winners, and admin tasks. Built with HTML, CSS, JavaScript, and Supabase as the backend.

## Features

- Browse upcoming and past events
- View campus announcements
- See winner spotlights
- Manage your own registrations
- Admin console for creating admins, events, announcements, winners, and registrations (simplified UI available)
- Theming (light/dark mode)

## Directory Structure

```
/ (project root)
├── index.html             # Main landing page
├── assets/                # Static assets
│   ├── css/               # Stylesheets (base.css, admin.css)
│   ├── images/            # Logo files (logo.png, logo2.png)
│   └── js/                # JavaScript logic (public-main, auth, admin, utils)
├── pages/                 # Additional HTML pages
│   ├── events.html
│   ├── announcements.html
│   ├── winners.html
│   ├── my-registrations.html
│   └── login.html
└── pages/admin/           # Admin console pages
    ├── dashboard.html
    ├── events.html
    ├── announcements.html
    ├── winners.html
    ├── registrations.html
    └── users.html
```

## Getting Started

1. **Prerequisites**
   - Node.js or Python installed (for local static server)
   - Internet connection (for CDN dependencies)

2. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <project-folder>
   ```

3. **Supabase Setup**
   - Sign up at [Supabase](https://supabase.com) and create a new project.
   - In `assets/js/utils/supabase.js`, update `SB_URL` and `SB_ANON` with your project's URL and anon key.

4. **Serve Locally**
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```
   Open [http://localhost:8000](http://localhost:8000) in your browser.

## Customization

- **Logo**: Place `logo.png` (main site logo) and `logo2.png` (favicon) in `assets/images/`.
- **Theme**: Toggle dark/light via the theme button in the header.
- **Supabase Functions**: Serverless functions reside in `supabase/functions/` (TypeScript).

## Deployment

- Deploy to any static hosting (Netlify, Vercel, GitHub Pages).
- Ensure the `assets/js/utils/supabase.js` file has correct production Supabase credentials.

## License

MIT © Nilgiri College CS Department