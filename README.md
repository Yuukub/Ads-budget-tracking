# 📊 Ad Budget Tracking System

> ระบบบริหารจัดการงบประมาณโฆษณาแบบครบวงจร สำหรับ Digital Agency และ Freelance
> รองรับการติดตามงบประมาณทั้ง **Google Ads** และ **Facebook Ads** พร้อมระบบจัดการลูกค้าและรายงาน Dashboard

![Project Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-Private-blue?style=flat-square)

---

## 🚀 ฟีเจอร์เด่น (Key Features)

### 👥 การจัดการลูกค้า (Client Management)

- **ระบบสมาชิก**: มีระบบ Login/Register พร้อมแบ่งสิทธิ์ **Admin** และ **User**
- **จัดการ Budget**: กำหนดงบประมาณรวม (Total Budget) และระบบ **Carry Over** (ยอดคงเหลือ/ยอดเกิน ยกไปเดือนถัดไปอัตโนมัติ)
- **Client Profile**: เก็บข้อมูลลูกค้า พร้อม Logo และประวัติแคมเปญเก่าๆ

### 📈 การจัดการแคมเปญ (Campaign Tracking)

- รองรับแพลตฟอร์มหลัก:
  - **Google Ads**: Search, Display, Performance Max (Pmax)
  - **Facebook Ads**
- **Real-time Status**: จัดสถานะแคมเปญให้อัตโนมัติ (Active, Near Expiry, Expired)
- **Active Days**: กำหนดวันที่โฆษณารันได้ (เช่น จันทร์-ศุกร์)
- **Budget Reallocation**: สามารถโยกงบระหว่างแคมเปญได้อย่างอิสระ
- **Archive System**: จัดเก็บแคมเปญเก่าเข้า Archive เพื่อดูย้อนหลังได้ โดยไม่รกหน้า Dashboard

### ⚙️ ระบบ Admin และการตั้งค่า (System Settings)

- **White Label**: ปรับแต่ง Logo, ชื่อแอป, และสีธีม (Primary Color) ให้ตรงกับแบรนด์ของคุณได้ผ่านหน้า Admin
- **Security**: รองรับ Cloudflare Turnstile เพื่อป้องกัน Spam ในหน้า Register/Login
- **User Management**: Admin สามารถจัดการสถานะ User (Active/Suspend) ได้

---

## 🛠️ Tech Stack

เทคโนโลยีทันสมัย ประสิทธิภาพสูง รองรับการขยายตัวในอนาคต (Scalable):

| Layer | Technologies |
|-------|--------------|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat-square) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat-square&logo=Prisma&logoColor=white) |
| **Database** | ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=flat-square&logo=mysql&logoColor=white) (Running on XAMPP/Cloud) |
| **Tools** | ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=flat-square&logo=eslint&logoColor=white) ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) |

---

## 📦 การติดตั้งและเริ่มต้นใช้งาน (Installation)

### 1. Clone Project

```bash
git clone https://github.com/Yuukub/Ads-budget-tracking.git
cd Ads-budget-tracking
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` (ดูตัวอย่างจาก `.env.example`) และตั้งค่าฐานข้อมูลของคุณ:

```env
# Database Server (MySQL)
DATABASE_URL="mysql://root:@localhost:3306/ad_budget_tracker"

# Security
JWT_SECRET="ตั้งรหัสลับของคุณที่นี่"
```

### 4. Setup Database

```bash
# สร้างตารางใน Database
npm run db:push

# (Optional) ดูข้อมูลใน Database ผ่าน UI
npm run db:studio
```

### 5. รันโปรแกรม (Development Mode)

```bash
npm run dev
```

- 🖥️ **Frontend**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend**: [http://localhost:3001](http://localhost:3001)

---

## 📂 โครงสร้างโปรเจ็ค (Project Structure)

```
ad-budget-tracking/
├── 📂 prisma/              # Database Schema & Migrations
├── 📂 server/              # Backend API (Express)
│   ├── 📂 routes/          # API Endpoints (Auth, Clients, Campaigns)
│   ├── 📂 middleware/      # Security & Validation
│   └── 📂 lib/             # Database Client Configuration
├── 📂 src/                 # Frontend (React)
│   ├── 📂 api/             # Centralized API Calls
│   ├── 📂 components/      # Reusable UI Components
│   │   ├── 📂 campaigns/   # Campaign-specific Components
│   │   ├── 📂 clients/     # Client Management Components
│   │   └── 📂 ui/          # Generic UI (Buttons, Inputs, Modals)
│   ├── 📂 hooks/           # Custom React Hooks
│   ├── 📂 pages/           # Application Pages (Routes)
│   └── 📂 context/         # Global State (Auth, Theme)
└── 📄 .env                 # System Configuration
```

---

Developed with ❤️ by **[Yuukub](https://github.com/Yuukub)**
