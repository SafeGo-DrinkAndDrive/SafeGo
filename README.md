# SafeGo Web

SafeGo is a modern full-stack web platform designed to help users quickly request safe transportation and driver assistance services. The platform focuses on safety, convenience, and real-time communication through location-based booking and integrated contact systems.

---

## Features

* User-friendly booking interface
* Real-time location support with Google Maps
* Driver assistance request system
* WhatsApp-based booking communication
* Firebase Authentication
* Firestore database integration
* Responsive modern UI
* Secure cloud-based backend services
* Fast frontend deployment with Vercel
* Mobile-friendly experience

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Lucide React

### Backend / Services

* Firebase Authentication
* Firestore Database
* Firebase Hosting (optional)

### APIs & Integrations

* Google Maps API
* WhatsApp Integration

---

## Project Structure

```bash
src/
├── components/
├── pages/
├── services/
├── hooks/
├── utils/
├── assets/
├── contexts/
└── App.tsx
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/safego-web.git
cd safego-web
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will run on:

```bash
http://localhost:5173
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## Firebase Setup

1. Create a Firebase project
2. Enable:

   * Authentication
   * Firestore Database
3. Add your web application
4. Copy Firebase config into `.env`

Official Website:

[Firebase](https://firebase.google.com?utm_source=chatgpt.com)

---

## Google Maps Setup

1. Create a Google Cloud project
2. Enable:

   * Maps JavaScript API
   * Places API
   * Geolocation API
3. Generate an API key
4. Add domain restrictions for production

Official Website:

[Google Maps Platform](https://mapsplatform.google.com?utm_source=chatgpt.com)

---

## Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Deployment

### Frontend Deployment

Recommended platforms:

* Vercel
* Firebase Hosting
* Netlify

### Recommended Setup

* Frontend → Vercel
* Backend Services → Firebase

Official Websites:

* [Vercel](https://vercel.com?utm_source=chatgpt.com)
* [Netlify](https://www.netlify.com?utm_source=chatgpt.com)

---

## Security Notes

* Never commit `.env` files
* Restrict Google Maps API keys
* Use Firebase Security Rules
* Validate all Firestore requests
* Enable authentication protection for admin features

---

## Future Improvements

* Live driver tracking
* Online payment integration
* Booking history
* Admin dashboard
* Push notifications
* Emergency contact system
* Ride scheduling
* AI-based safety monitoring

---

## Screenshots

Add screenshots here:

```bash
/public/screenshots/
```

Example:

```md
![Home Page](public/screenshots/home.png)
```

---

## License

This project is licensed under the MIT License.

---

## Author

Developed by Rumeth Wijethunge

* [GitHub Profile](https://github.com/rux-xy?utm_source=chatgpt.com)
