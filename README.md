# Ad Budget Tracker

โปรแกรมบันทึกงบโฆษณาของลูกค้า รองรับ Google Ads และ Facebook Ads

## Features

- ระบบ Login/Register
- จัดการลูกค้าและงบรวม
- จัดการแคมเปญโฆษณา (Google Ads: Search, Display, Pmax และ Facebook Ads)
- บันทึกและอัพเดทงบที่ใช้ไปแล้ว
- แสดงสถานะแคมเปญ (Active, ใกล้หมดอายุ, หมดอายุ)
- โยกงบระหว่างแคมเปญได้

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Express.js + JWT Authentication
- **Database**: PostgreSQL + Prisma ORM

## Getting Started

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Database

แก้ไขไฟล์ `.env` และตั้งค่า Database URL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/ad_budget_tracker"
JWT_SECRET="your-secret-key"
PORT=3001
```

### 3. Generate Prisma Client และ Push Schema

```bash
npm run db:generate
npm run db:push
```

### 4. รันโปรแกรม

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Scripts

- `npm run dev` - รัน Frontend และ Backend พร้อมกัน
- `npm run dev:client` - รันเฉพาะ Frontend
- `npm run dev:server` - รันเฉพาะ Backend
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push Schema ไปยัง Database
- `npm run db:studio` - เปิด Prisma Studio

## Project Structure

```
ad-budget-tracker/
├── prisma/              # Database schema
├── server/              # Backend API
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   └── lib/             # Prisma client
├── src/                 # Frontend React
│   ├── api/             # API calls
│   ├── components/      # React components
│   ├── context/         # Auth context
│   ├── pages/           # Page components
│   ├── types/           # TypeScript types
│   └── utils/           # Helper functions
└── .env                 # Environment variables
```
