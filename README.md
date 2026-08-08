# RHTS Milling Cell Configurator

Online configurator for robotic milling cells. Customers pick a milling pack, choose a
robot and options, and receive an automatic PDF offer by email (with a copy to the admin).
Includes an admin panel to manage all content.

## Stack
- **Next.js 14** (App Router) + TypeScript
- **SQLite** via **Prisma**
- **Tailwind CSS**
- **@react-pdf/renderer** for PDF offers
- **nodemailer** for email (preview mode until SMTP is configured)
- Multilanguage: **English / Español / Українська**

## Getting started
```bash
npm install
npx prisma db push      # create the database
npm run db:seed         # load sample packs, robots, options, projects
npm run dev             # http://localhost:3000
```

## Customer flow
1. **Home** (`/en`) — hero carousel of reference projects, the three milling packs
   (Core / Power / Beast), and the ENCY Robot CAM software block.
2. **Package page** (`/en/package/core`) — admin-editable description + specs, then the
   configurator: choose a robot, add option cards grouped by category, live running total.
3. **Submit** — customer enters first name, last name, phone, email → an offer number is
   generated, a PDF is created and emailed to the customer with a copy to the admin.

## Admin panel (`/admin`)
Password login (set `ADMIN_PASSWORD` in `.env`). Manage:
- **Leads / Offers** — every submitted configuration, PDF link, status (new/contacted/closed)
- **Milling packs** — name, tagline, description (per language), specs, price, image
- **Robots** — brand, model, year, arm reach, payload, controller, price, image
- **Option groups & options** — create groups and option cards, per-language, with prices
- **Carousel projects** — hero slides
- **Settings** — company info, admin email, offer prefix, price note

## Email
Email runs in **preview mode** while `SMTP_HOST` is empty in `.env`: instead of sending,
each offer's email HTML + PDF are written to `.mail-preview/`. To send for real, fill in the
SMTP block in `.env` (host, port, user, password, from) and restart.

## Configuration (`.env`)
| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Admin panel password |
| `AUTH_SECRET` | Secret for signing the admin session cookie |
| `SMTP_HOST` … `SMTP_FROM` | Email provider (leave `SMTP_HOST` empty for preview mode) |

The admin recipient address for lead copies is set in **Admin → Settings → Admin email**.

## Notes
- Prices in the PDF/offer are always recomputed server-side from the database — client input
  is never trusted.
- Images are referenced by URL (paste any image link in the admin). A file-upload feature can
  be added later.
