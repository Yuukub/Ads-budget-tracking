# คู่มือการติดตั้ง Ad Budget Tracker บน Hostinger

โปรเจ็คนี้ถูกเตรียมพร้อมสำหรับการติดตั้งบน **Hostinger Node.js Web Apps hosting** แล้วครับ

## 📋 สิ่งที่ต้องเตรียม
1. บัญชี Hostinger (แนะนำแผน Business หรือ Cloud)
2. ฐานข้อมูล PostgreSQL ที่เข้าถึงได้จากแอป (เช่น Hostinger PostgreSQL หรือ managed PostgreSQL)

---

## 🚀 ขั้นตอนการติดตั้ง (Step-by-Step)

### 1. การเตรียมไฟล์
- บีบอัดไฟล์ทั้งหมดในโฟลเดอร์โปรเจ็คเป็นไฟล์ `.zip` (ยกเว้น `node_modules` และ `.env`)
- ไปที่ hPanel > **Web Apps** > **Create Web App**
- เลือก **Node.js**

### 2. การสร้างฐานข้อมูล (Database)
- ไปที่ hPanel > **Databases** > **Management**
- สร้างฐานข้อมูล PostgreSQL ใหม่ เช่น `ad_budget_tracker_db`
- จดบันทึก **Database Name**, **Username**, และ **Password** ไว้

### 3. การตั้งค่า Environment Variables (.env)
ในหน้าจัดการ Web App ของ Hostinger ให้เพิ่ม Environment Variables ต่อไปนี้:
- `DATABASE_URL`: `postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME?schema=public`
- `JWT_SECRET`: (กำหนดค่ายากๆ เช่น `a-very-secret-random-string`)
- `PORT`: `3001` (หรือตามที่ Hostinger กำหนด)
- `NODE_ENV`: `production`

### 4. การรันแอป
Hostinger จะรันคำสั่งโดยอัตโนมัติดังนี้:
1. `npm install` (รวมถึง `prisma generate` ที่อยู่ใน `postinstall`)
2. `npm run build` (เพื่อสร้างไฟล์ Frontend ในโฟลเดอร์ `dist`)
3. `npm start` (เพื่อเริ่มการทำงานของเซิร์ฟเวอร์)

---

## ⚠️ ขั้นตอนสำคัญ: Prisma migrations

Production ต้องใช้ migration ที่ตรวจสอบย้อนกลับได้ ไม่ใช้ `prisma db push`:

1. สำรอง PostgreSQL ก่อน deploy
2. หลัง `npm install` ให้รัน `npx prisma migrate deploy`
3. เปิด feature flag `CAMPAIGN_CYCLES_V2_ENABLED=true` หลังตรวจ migration แล้ว
4. รัน `npm run db:backfill-cycles` เพียงครั้งแรก (script รันซ้ำได้) และตรวจจำนวนแคมเปญ/ยอดรวม

ตาราง `campaigns` เดิมจะยังคงอยู่สำหรับ fallback อย่างน้อยหนึ่ง release. หากยังไม่เปิด flag ระบบจะทำงานด้วยข้อมูล legacy เดิม

---

## 🛠️ การแก้ไขปัญหาเบื้องต้น
- **Connect Database ไม่ได้**: ตรวจสอบ `DATABASE_URL` ว่า Username/Password ถูกต้องหรือไม่
- **หน้าเว็บขาว**: ตรวจสอบว่า `NODE_ENV` เป็น `production` และโฟลเดอร์ `dist` ถูกสร้างขึ้นจริงหรือไม่
- **สมัครสมาชิกไม่ได้**: ตรวจสอบว่าได้รัน `npx prisma migrate deploy` แล้วหรือยัง

---
จัดทำโดย Antigravity (Google DeepMind)
