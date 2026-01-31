# 📊 Ad Budget Tracking System

> ระบบบริหารจัดการงบประมาณโฆษณาแบบครบวงจร สำหรับ Digital Agency และ Freelance
> รองรับการติดตามงบประมาณทั้ง **Google Ads** และ **Facebook Ads** พร้อมระบบจัดการลูกค้าและรายงาน Dashboard

![Project Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-Private-blue?style=flat-square)

---

## 🚀 ฟีเจอร์เด่น (Key Features)

### 👥 การจัดการลูกค้า (Client Management)

- **ระบบสมาชิก**: มีระบบ Login/Register พร้อมแบ่งสิทธิ์ **Admin** และ **User**
- **Client Profile**: เก็บข้อมูลลูกค้า พร้อม Logo และประวัติแคมเปญเก่าๆ
- **Budget Management**:
  - **Total Budget**: กำหนดงบประมาณรวมของลูกค้า
  - **Allocated/Unallocated**: ติดตามยอดเงินที่จัดสรรไปแล้วและยอดคงเหลือแบบ Real-time

### 📑 บัญชีงบประมาณ (Budget Ledger) ✨ *New*

- **Budget Tracking**:
  - **Top-up**: บันทึกยอดเติมเงินเข้าระบบที่ใช้จริง
  - **Received**: บันทึกยอดเงินที่ลูกค้าแจ้งโอน (สำหรับตรวจสอบยอด)
- **Remaining Usable**: คำนวณยอดเงินคงเหลือที่สามารถใช้งานได้จริงให้อัตโนมัติ
- **Transaction History**: ดูประวัติการเติมเงินและการรับเงินย้อนหลังได้

### 📈 การจัดการแคมเปญ (Campaign Tracking)

- รองรับแพลตฟอร์มหลัก:
  - **Google Ads**: Search, Display, Performance Max (Pmax)
  - **Facebook Ads**
- **Real-time Status**: จัดสถานะแคมเปญให้อัตโนมัติ (Active, Near Expiry, Expired)
- **Active Days**: คำนวณจำนวนวันที่แคมเปญทำงาน (ไม่รวมวันหยุดที่กำหนด)
- **Budget Control**: ตรวจสอบงบประมาณคงเหลือของลูกค้าก่อนสร้างแคมเปญ เพื่อป้องกันงบเกิน

### 📊 ระบบรายงานและนำออกข้อมูล (Data Export) ✨ *New*

- **Export to Excel**:
  - รองรับการ Export ข้อมูล **History** และ **Budget Log**
  - **Smart Formatting**: จัดรูปแบบไฟล์สวยงาม (Bold Header, Colors, Borders) แยกคอลัมน์ให้อ่านง่าย
  - **Budget Ledger**: สรุปยอดแยกรายการ รับเข้า/จ่ายออก ชัดเจน
- **Export to CSV**: รองรับการนำไปใช้งานต่อกับโปรแกรมอื่นๆ

### ⚙️ ระบบ Admin และการตั้งค่า (System Settings)

- **White Label**: ปรับแต่ง Logo, ชื่อแอป, และสีธีม (Primary Color) ให้ตรงกับแบรนด์ของคุณ
- **Security**: รองรับ Cloudflare Turnstile เพื่อป้องกัน Spam ในหน้า Register/Login
- **User Management**: Admin สามารถจัดการสถานะ User (Active/Suspend) ได้

---

## 🛠️ Tech Stack

เทคโนโลยีทันสมัย ประสิทธิภาพสูง รองรับการขยายตัวในอนาคต (Scalable):

| Layer | Technologies |
|-------|--------------|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat-square) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat-square&logo=Prisma&logoColor=white) |
| **Database** | ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=flat-square&logo=mysql&logoColor=white) |
| **Libraries** | `ExcelJS` (Export), `Lucide React` (Icons), `Radix UI` (Components), `Axios` |

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
├── 📂 src/                 # Frontend (React)
│   ├── 📂 api/             # Centralized API Calls
│   ├── 📂 components/      # Reusable UI Components
│   │   ├── 📂 campaigns/   # Campaign-specific Components
│   │   ├── 📂 clients/     # Client Management Components
│   │   └── 📂 ui/          # Generic UI (ExportButton, Modal, etc.)
│   ├── 📂 hooks/           # Custom React Hooks
│   ├── 📂 pages/           # Application Pages (BudgetLog, History, etc.)
│   └── 📂 context/         # Global State (Auth, Theme)
└── 📄 .env                 # System Configuration
```

---

Developed with ❤️ by **[Yuukub](https://github.com/Yuukub)**
