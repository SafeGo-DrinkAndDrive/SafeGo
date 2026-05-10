# SafeGo v2 — Complete Setup Guide

## Project Structure

```
SafeGo-v2/
├── src/                          ← React frontend (Vite + TypeScript)
│   ├── components/
│   │   ├── AdminRoute.tsx        ← Admin-only route guard
│   │   ├── LocationInput.tsx     ← Google Places autocomplete
│   │   ├── ProtectedRoute.tsx    ← Auth route guard
│   │   ├── Navbar.tsx            ← Updated: async logout, avatar, mobile menu
│   │   └── ...                   ← Unchanged UI components
│   ├── contexts/
│   │   └── AuthContext.tsx       ← Firebase Auth + Google + roles
│   ├── hooks/
│   │   ├── useBookings.ts        ← User bookings via backend API
│   │   └── useAdmin.ts           ← Admin: all bookings + users
│   ├── pages/
│   │   ├── Login.tsx             ← Email + Google login
│   │   ├── Register.tsx          ← Email + Google register
│   │   ├── Booking.tsx           ← Maps autocomplete + real fare
│   │   └── AdminDashboard.tsx    ← Full CRUD dashboard
│   ├── services/
│   │   └── api.ts                ← Typed HTTP client (Bearer token)
│   ├── types/index.ts            ← All TypeScript interfaces
│   └── firebase.ts               ← Firebase client init
│
├── server/                       ← Express backend (Node.js + TypeScript)
│   └── src/
│       ├── middleware/
│       │   └── auth.ts           ← Firebase token verify + role check
│       ├── routes/
│       │   ├── bookings.ts       ← POST / GET / PATCH with Zod validation
│       │   └── users.ts          ← GET /me, GET all (admin)
│       ├── services/
│       │   ├── fareService.ts    ← Google Distance Matrix (server-only)
│       │   └── emailService.ts   ← Nodemailer — booking + status emails
│       ├── firebase-admin.ts     ← Admin SDK init
│       └── index.ts              ← Helmet, CORS, rate-limit, routes
│
├── firestore.rules               ← Firestore security rules
├── firestore.indexes.json        ← Composite indexes
├── firebase.json                 ← Firebase CLI config
├── vercel.json                   ← SPA routing fix for Vercel
└── server/railway.toml           ← Railway deploy config
```

---

## Step 1 — Firebase Project Setup

### 1a. Create Firebase project
1. Go to https://console.firebase.google.com
2. **Add project** → name it `safego` → continue

### 1b. Enable Authentication
1. Build → Authentication → Get started
2. **Sign-in method** tab → Enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → set Project support email → Save
3. **Settings** tab → Authorized domains → Add:
   - `localhost`
   - `your-app.vercel.app` (add after deploying)

### 1c. Create Firestore database
1. Build → Firestore Database → Create database
2. Choose **Start in production mode** → select your region → Done

### 1d. Deploy Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### 1e. Get client config
1. Project Settings (gear icon) → Your apps → Add app → Web
2. Register app → copy the `firebaseConfig` object values into `.env`

### 1f. Generate Admin SDK service account
1. Project Settings → Service Accounts → **Generate new private key**
2. Download the JSON file
3. Copy the **entire JSON content** (minified, single line) into `server/.env` as `FIREBASE_SERVICE_ACCOUNT`

---

## Step 2 — Google Maps API

1. Go to https://console.cloud.google.com
2. Select (or create) the same project as Firebase
3. APIs & Services → Library → enable all three:
   - **Maps JavaScript API** (frontend autocomplete)
   - **Places API** (frontend autocomplete)
   - **Distance Matrix API** (backend fare calculation)
4. APIs & Services → Credentials → Create Credentials → API Key
5. **Restrict the key** (important!):
   - For the **frontend key**: Application restrictions → HTTP referrers →
     add `http://localhost:5173/*` and `https://your-app.vercel.app/*`
   - For the **backend key** (recommended: separate key): Application
     restrictions → IP addresses → add your server's IP
6. Add keys to both `.env` files

---

## Step 3 — Email Setup (Gmail)

1. Log in to the Gmail account you want to send from
2. Go to https://myaccount.google.com/security
3. Enable **2-Step Verification** (required for App Passwords)
4. Go to https://myaccount.google.com/apppasswords
5. Select app: **Mail** → Select device: **Other** → name it `SafeGo` → Generate
6. Copy the 16-character password → paste into `SMTP_PASS` in `server/.env`

---

## Step 4 — Promote a User to Admin

After creating your admin account through the app:

**Option A — Firebase Console:**
1. Firestore → users → find the document for your admin account
2. Click the `role` field → change value from `"user"` to `"admin"` → Update

**Option B — Admin SDK script (run once):**
```ts
// scripts/promoteAdmin.ts
import admin from 'firebase-admin';
import serviceAccount from './service-account.json';

admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) });

const email = 'admin@yourcompany.com';  // change this

async function promote() {
  const users  = await admin.firestore().collection('users')
    .where('email', '==', email).get();
  if (users.empty) { console.log('User not found'); return; }
  const doc = users.docs[0];
  await doc.ref.update({ role: 'admin' });
  console.log(`Promoted ${email} to admin`);
  process.exit(0);
}

promote();
```
```bash
cd server && npx ts-node scripts/promoteAdmin.ts
```

---

## Step 5 — Local Development

### Frontend
```bash
# In the project root
cp .env.example .env
# Fill in .env with your Firebase + Maps keys

npm install
npm run dev
# → http://localhost:5173
```

### Backend
```bash
cd server
cp .env.example .env
# Fill in server/.env

npm install
npm run dev
# → http://localhost:4000
# → GET http://localhost:4000/health  should return {"status":"ok"}
```

---

## Step 6 — Deploy Frontend to Vercel

1. Push your project to GitHub (do NOT commit `.env` files)
2. Go to https://vercel.com → New Project → Import your repo
3. **Build settings:**
   | Setting | Value |
   |---|---|
   | Framework Preset | `Vite` |
   | Root Directory | `.` (project root) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
4. **Environment Variables** → Add all variables from `.env.example`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_API_URL` → your Railway server URL
   - `VITE_WHATSAPP_NUMBER`
5. Deploy → copy your `.vercel.app` URL
6. Add the URL to Firebase Authorized Domains (Step 1b)

---

## Step 7 — Deploy Backend to Railway

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select your repo → set **Root Directory** to `server`
3. Railway auto-detects Node.js from `railway.toml`
4. **Variables** tab → Add all variables from `server/.env.example`:
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`
   - `FIREBASE_SERVICE_ACCOUNT` → paste the full JSON string
   - `GOOGLE_MAPS_API_KEY`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL`
5. Deploy → copy the Railway URL
6. Update `VITE_API_URL` in Vercel to point to Railway URL
7. Redeploy Vercel frontend

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Server health check |
| POST | `/api/bookings` | User | Create booking (fare calculated server-side) |
| POST | `/api/bookings/estimate` | User | Estimate fare before booking |
| GET | `/api/bookings` | User | Own bookings / Admin gets all |
| PATCH | `/api/bookings/:id/status` | User/Admin | Update status (with transition validation) |
| GET | `/api/users/me` | User | Own profile |
| GET | `/api/users` | Admin | All users |

## Booking Status Flow

```
pending → confirmed → ongoing → completed
    ↓           ↓          ↓
cancelled   cancelled  cancelled
```

Only the backend validates transitions. A client cannot jump from `pending` directly to `completed`.

---

## Security Checklist

- [x] Firebase tokens verified server-side on every request
- [x] Roles stored in Firestore, read by server — never trusted from client
- [x] Fare calculated exclusively on the server — clients cannot send fare
- [x] Zod validates all incoming request bodies
- [x] Booking status transitions enforced — no arbitrary jumps
- [x] Firestore rules block all direct client writes to `/bookings`
- [x] Helmet sets secure HTTP headers
- [x] CORS whitelist — only your frontend domain allowed
- [x] Rate limiting — 100 req/15 min global, 20 on write endpoints
- [x] JSON body capped at 64 KB
- [x] Service account key loaded from env var — never in source code
- [x] Google Maps API key restricted by domain / IP
- [x] SMTP password via Gmail App Password — not your account password
