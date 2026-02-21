import type { GetServerSideProps } from "next";
import {
  Card, CardBody, CardHeader, Chip, Divider,
} from "@heroui/react";
import DefaultLayout from "@/layouts/default";

interface LayoutTablePageProps {
  layoutImageUrl?: string;
}
export default function LayoutTablePage({ layoutImageUrl }: LayoutTablePageProps) {
  return (
    <DefaultLayout>
      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="rounded-3xl border border-white/10 bg-black/30 shadow-2xl backdrop-blur-xl">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">แผนผังร้าน</h1>
                <Chip
                  className="text-xs font-semibold uppercase bg-emerald-500/15 text-emerald-200 border border-emerald-400/40"
                  radius="full"
                  variant="flat"
                >
                  Tably
                </Chip>
              </div>
            </div>
          </CardHeader>

          <Divider className="mx-6 bg-white/10" /><br></br>
          <CardBody>
            {layoutImageUrl ? (
              <div className="w-full overflow-hidden rounded-2xl border border-white/10 p-1">
                <img
                  src={layoutImageUrl}
                  alt="แผนผังร้าน"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>
            ) : (
              // แสดงส่วนนี้ ถ้า Admin ยังไม่ใส่ URL รูปภาพ
              <Card className="rounded-3xl border border-dashed border-white/15 bg-white/5">
                <CardBody className="flex flex-col items-center gap-4 py-12 text-center text-white/70">
                  <svg className="h-10 w-10 text-white/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm1.5-1.5a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H3.75Z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">ยังไม่มีรูปภาพแผนผัง</h2>
                  <p className="max-w-md text-sm">
                    ผู้ดูแลระบบยังไม่ได้กำหนด URL ของรูปภาพแผนผังร้านในหน้าตั้งค่า
                  </p>
                </CardBody>
              </Card>
            )}
          </CardBody>
        </Card>
      </section>
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps<LayoutTablePageProps> = async (context) => {
  const host = context.req.headers.host ?? "localhost:3000";
  const forwardedProto = context.req.headers["x-forwarded-proto"];
  const forwardedValue = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto;
  const socket = context.req.socket as { encrypted?: boolean } | undefined;
  const protocol =
    forwardedValue && typeof forwardedValue === "string"
      ? forwardedValue
      : socket?.encrypted
        ? "https"
        : "http";
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`).replace(/\/$/, "");
  const settingsApiUrl = `${baseUrl}/api/settings`;

  try {
    let layoutImageUrl = "";
    try {
      const settingsRes = await fetch(settingsApiUrl, {
        headers: { cookie: context.req.headers.cookie ?? "" },
        cache: "no-store",
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        layoutImageUrl = settingsData.layoutImageUrl || "";
      }
    } catch (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
    }
    return { props: { layoutImageUrl } }; 

  } catch (error) {
    console.error("Failed to fetch page data:", error);
    return { props: { layoutImageUrl: "" } };
  }
};