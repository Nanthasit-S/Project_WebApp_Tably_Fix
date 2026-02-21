// web-app-none-node/config/fonts.ts
import { Fira_Code as FontMono, Sarabun as FontSans } from "next/font/google"; // [!!] เปลี่ยน Inter เป็น Sarabun

export const fontSans = FontSans({
  subsets: ["latin", "thai"], // [!!] เพิ่ม 'thai' subset
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"], // [!!] ระบุน้ำหนักที่ต้องการ
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});
