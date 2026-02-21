import type { GetServerSideProps } from "next";
import Link from "next/link";

type Props = {
  errorCode: string;
  message: string;
};

const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "AccessDenied":
      return "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
    case "Configuration":
      return "การตั้งค่าระบบล็อกอินไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ";
    case "Verification":
      return "การยืนยันตัวตนล้มเหลว กรุณาลองใหม่อีกครั้ง";
    case "Database":
      return "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบค่า SUPABASE_DB_POOLER_URL และลองอีกครั้ง";
    default:
      return "เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ";
  }
};

export default function AuthErrorPage({ errorCode, message }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">เข้าสู่ระบบไม่สำเร็จ</h1>
      <p className="mt-3 text-sm text-default-600">{message}</p>
      <p className="mt-2 text-xs text-default-400">Error code: {errorCode}</p>

      <div className="mt-6 flex gap-3">
        <Link
          className="rounded-lg border border-default-300 px-4 py-2 text-sm"
          href="/"
        >
          กลับหน้าแรก
        </Link>
        <Link
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background"
          href="/"
        >
          ลองเข้าสู่ระบบอีกครั้ง
        </Link>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const errorCode = String(context.query.error || "Unknown");

  return {
    props: {
      errorCode,
      message: getErrorMessage(errorCode),
    },
  };
};
