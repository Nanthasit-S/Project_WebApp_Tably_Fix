# Tably (Next.js + Supabase)

โปรเจกต์นี้รองรับการ deploy บน Vercel และใช้ Supabase แทน MariaDB แล้ว

## 1) ติดตั้งแพ็กเกจ

```bash
bun install
```

## 2) Environment Variables

สร้างไฟล์ `.env.local` และใส่ค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
SUPABASE_STORAGE_BUCKET=uploads

LINE_LOGIN_CHANNEL_ID=
LINE_LOGIN_CHANNEL_SECRET=
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=

NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_SITE_URL=

OPENSLIPVERIFY_TOKEN=
PROMPTPAY_ACCOUNT=

# ถ้าต่อ Postgres local ที่ไม่ใช้ SSL:
# DB_DISABLE_SSL=true
```

## 3) Supabase ที่ต้องเตรียม

- สร้างโปรเจกต์ Supabase
- สร้าง `public bucket` ชื่อ `uploads` (หรือใช้ชื่อเดียวกับ `SUPABASE_STORAGE_BUCKET`)
- นำ schema เดิมขึ้น Supabase Postgres (แนะนำผ่าน migration/SQL Editor)

หมายเหตุ:
- ระบบจะสร้างตาราง `booking_orders` และ `ui_texts` ให้อัตโนมัติเมื่อมีการเรียกใช้งานครั้งแรก

## 4) Run Local

```bash
bun run dev
```

## 5) Deploy Vercel

- Push ขึ้น Git repository
- Import โปรเจกต์ใน Vercel
- ตั้งค่า Environment Variables ชุดเดียวกับ `.env.local`
- Deploy

