# คู่มือการติดตั้ง Ad Budget Tracker บน Hostinger

โปรเจ็คนี้ถูกเตรียมพร้อมสำหรับการติดตั้งบน **Hostinger Node.js Web Apps hosting** แล้วครับ

## 📋 สิ่งที่ต้องเตรียม
1. บัญชี Hostinger (แนะนำแผน Business หรือ Cloud)
2. ฐานข้อมูล MySQL (สร้างผ่าน hPanel)

---

## 🚀 ขั้นตอนการติดตั้ง (Step-by-Step)

### 1. การเตรียมไฟล์
- บีบอัดไฟล์ทั้งหมดในโฟลเดอร์โปรเจ็คเป็นไฟล์ `.zip` (ยกเว้น `node_modules` และ `.env`)
- ไปที่ hPanel > **Web Apps** > **Create Web App**
- เลือก **Node.js**

### 2. การสร้างฐานข้อมูล (Database)
- ไปที่ hPanel > **Databases** > **Management**
- สร้างฐานข้อมูลใหม่ เช่น `ad_budget_tracker_db`
- จดบันทึก **Database Name**, **Username**, และ **Password** ไว้

### 3. การตั้งค่า Environment Variables (.env)
ในหน้าจัดการ Web App ของ Hostinger ให้เพิ่ม Environment Variables ต่อไปนี้:
- `DATABASE_URL`: `mysql://USERNAME:PASSWORD@localhost:3306/DATABASE_NAME`
- `JWT_SECRET`: (กำหนดค่ายากๆ เช่น `a-very-secret-random-string`)
- `PORT`: `3001` (หรือตามที่ Hostinger กำหนด)
- `NODE_ENV`: `production`

### 4. การรันแอป
Hostinger จะรันคำสั่งโดยอัตโนมัติดังนี้:
1. `npm install` (รวมถึง `prisma generate` ที่อยู่ใน `postinstall`)
2. `npm run build` (เพื่อสร้างไฟล์ Frontend ในโฟลเดอร์ `dist`)
3. `npm start` (เพื่อเริ่มการทำงานของเซิร์ฟเวอร์)

---

## ⚠️ ขั้นตอนสำคัญ: การตั้งค่า SQL (Prisma)
เนื่องจากต้องสร้างตารางในฐานข้อมูลเป็นครั้งแรก:
- หลังจาก Deploy ครั้งแรกเสร็จแล้ว ให้เข้าไปที่เมนู **Terminal** หรือ **Run Script** ใน Hostinger
- รันคำสั่ง: `npx prisma db push` เพื่อส่งโครงสร้างตารางไปยัง MySQL

---

## 🛠️ การแก้ไขปัญหาเบื้องต้น
- **Connect Database ไม่ได้**: ตรวจสอบ `DATABASE_URL` ว่า Username/Password ถูกต้องหรือไม่
- **หน้าเว็บขาว**: ตรวจสอบว่า `NODE_ENV` เป็น `production` และโฟลเดอร์ `dist` ถูกสร้างขึ้นจริงหรือไม่
- **สมัครสมาชิกไม่ได้**: ตรวจสอบว่าได้รัน `npx prisma db push` แล้วหรือยัง

---
จัดทำโดย Antigravity (Google DeepMind)
