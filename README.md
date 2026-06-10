# Workforce HRMS

Workforce Attendance & Payroll Management System for manpower agencies.

## Setup & Running Locally

**Prerequisites:** Node.js (v18+ recommended)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (use `.env.example` as a template):
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

> The database schema is in `supabase/schema.sql`. Run it in your Supabase SQL Editor to create all required tables.
> Default login: **username** `admin` / **password** `admin123`

### 3. Start the Application
Run both the Express backend server (port 5000) and the Vite frontend (port 3000) concurrently:
```bash
npm run dev:all
```

Alternatively, you can run them individually in separate terminals:
- Backend server: `npm run server`
- Frontend client: `npm run dev`

### 4. Build for Production
To build both the frontend bundle and bundle the backend server:
```bash
npm run build
```
To run the production build:
```bash
node server.js
```
