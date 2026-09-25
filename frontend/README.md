# MindMap - Real-Time Student Attention & Confusion Detector

MindMap is a production-quality AI SaaS platform designed for virtual classrooms. It detects student attention levels, focus trends, and confusion spikes in real time using MediaPipe FaceMesh computer vision—**100% client-side** with zero video privacy leaks.

---

## 🚀 Quick Start Guide for Recipient

### 1. Prerequisites
Ensure you have **Node.js (v18 or higher)** installed on your machine.
- Check Node version: `node -v`
- Download Node.js: [nodejs.org](https://nodejs.org)

### 2. Installation
Open your terminal inside the project directory and run:

```bash
npm install
```

### 3. Run Development Server
Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to:
**`http://localhost:5173`**

### 4. Build for Production
To generate an optimized production bundle:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 💻 Portal Routes Overview

- **Landing Page**: `/`
- **Sign In / Sign Up**: `/login` | `/register`
- **Student Dashboard**: `/student/dashboard`
- **Teacher Dashboard**: `/teacher/dashboard`
- **Live AI Classroom Meeting**: `/classroom/demo` or `/classroom/QUANTUM-101`
- **Admin Panel**: `/admin/dashboard`

---

## 🛠️ Key Technologies Used

- **Framework**: React 18, TypeScript 5, Vite 5
- **Styling**: Tailwind CSS 3.4 (Custom Dark Theme + Glassmorphism)
- **Computer Vision AI**: MediaPipe FaceMesh (`@mediapipe/face_mesh`) running via WebAssembly
- **PDF Report Exporter**: jsPDF & jsPDF-AutoTable
- **Charts & HUD**: Recharts (`<AreaChart>`, `<BarChart>`)
- **Real-Time Telemetry**: Socket.io Client & WebRTC
- **Animations**: Framer Motion
- **Form Validation**: React Hook Form + Zod

---

## 🛡️ Privacy Guarantee

All camera frames are processed locally inside the browser using WebAssembly. No video or image data is ever uploaded or recorded on servers. Only calculated numerical telemetry metrics ($0-100\%$) are transmitted.
