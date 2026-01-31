# 📊 Ad Budget Tracking System

> ระบบบริหารจัดการงบประมาณโฆษณาแบบครบวงจร สำหรับ Digital Agency และ Freelance
> ติดตามงบประมาณ **Google Ads** และ **Facebook Ads** แม่นยำ พร้อมระบบบัญชีงบประมาณ (Budget Ledger) ที่ช่วยแยกยอดเงินเติมและยอดเงินรับจริง

![Project Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-Private-blue?style=flat-square)

---

## 🚀 ฟีเจอร์เด่น (Key Features)

### 👥 การจัดการลูกค้า (Client Management)
- **ระบบสมาชิก**: แบ่งสิทธิ์การใช้งาน **Admin** และ **User** อย่างชัดเจน
- **Client Profile**: เก็บข้อมูลลูกค้าพร้อมโลโก้ และประวัติการโฆษณา
- **Budget Overview**: ดูภาพรวมงบประมาณที่ใช้ไปและคงเหลือได้ทันที

### 📑 บัญชีงบประมาณ (Budget Ledger) ✨
- **แยกกระเป๋าเงินชัดเจน**:
  - **Top-up**: ยอดเงินที่เติมเข้าระบบจริง (เช่น ตัดบัตรเครดิต)
  - **Received**: ยอดเงินที่ลูกค้าโอนเข้ามา (เพื่อการทำบัญชี)
- **Usable Budget**: คำนวณ "งบที่ใช้ได้จริง" (Top-up หักลบยอดจ่าย) เพื่อป้องกันการยิงโฆษณาเกินงบ

### 📈 การจัดการแคมเปญ (Campaign Tracking)
- **Multi-Platform Support**: รองรับทั้ง Google Ads (Search, Display, Performance Max) และ Facebook Ads
- **Active Days Control**: กำหนดวันรันโฆษณาได้ (เช่น จันทร์-ศุกร์)
- **Smart Status**: ระบบปรับสถานะ Active/Expired อัตโนมัติตามวันที่กำหนด
- **Archive System**: จัดเก็บแคมเปญเก่าเข้ากรุ เพื่อให้หน้า Dashboard สะอาดตา

### 📊 ระบบรายงาน (Data Export) ✨
- **Excel Report (XLSX)**: นำออกข้อมูลสวยงาม พร้อมจัดรูปแบบ (Bold Headers, Colors, Borders) โดยใช้ `ExcelJS`
- **CSV Support**: นำออกข้อมูลดิบเพื่อไปวิเคราะห์ต่อได้ง่าย
- **Sorting**: เรียงลำดับข้อมูลตามวันที่ (เก่า -> ใหม่) ให้อ่านง่าย

---

## 🛠️ Tech Stack

โปรเจ็คนี้พัฒนาด้วย Modern Stack ที่เน้นประสิทธิภาพ ความสวยงาม และดูแลรักษาง่าย:

| Layer | Technology | รายละเอียด |
|-------|------------|------------|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) | พัฒนาด้วย **Vite** เพื่อความเร็วสูงสุด |
| **UI Framework** | ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui&logoColor=white) | ใช้ **shadcn/ui** เพื่อความสวยงามและ Accessible |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat-square) | REST API มาตรฐาน พร้อม Middleware ปลอดภัย |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white) | เชื่อมต่อผ่าน **Prisma ORM** |
| **Storage** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) | ใช้เก็บไฟล์ Logo ลูกค้า (Object Storage) |

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
สร้างไฟล์ `.env` ที่ root folder และกำหนดค่าดังนี้:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/ad_budget_tracker?schema=public"

# Authentication
JWT_SECRET="your-super-secret-key"

# (Optional) Supabase Storage
SUPABASE_URL="your-supabase-url"
SUPABASE_KEY="your-supabase-anon-key"
```

### 4. Setup Database
```bash
# Push Schema ไปยัง Database
npm run db:push

# (Optional) เปิด Prisma Studio เพื่อจัดการข้อมูล
npm run db:studio
```

### 5. Start Development Server
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

---

## 📂 โครงสร้างโปรเจ็ค (Project Structure)

```
.
├── 📂 prisma/               # Database Schema (PostgreSQL)
├── 📂 server/               # Backend API Source Code
│   └── 📂 routes/           # API Endpoints
├── 📂 src/                  # Frontend Source Code
│   ├── 📂 api/              # API Integration Layer
│   ├── 📂 components/       # UI Components
│   │   ├── 📂 ui/           # shadcn/ui Components (Button, Input, etc.)
│   │   └── 📂 clients/      # Client-specific Components
│   ├── 📂 pages/            # Page Views (History, Budget Log)
│   └── 📂 types/            # TypeScript Interfaces
└── 📄 package.json          # Dependencies & Scripts
```

---

Developed with ❤️ by **[Yuukub](https://github.com/Yuukub)**
