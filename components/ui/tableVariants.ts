// fixcy/components/tableVariants.ts
import { tv } from "tailwind-variants";

export const tableVariant = tv({
  base: [
    "flex flex-col items-center justify-center",
    "font-semibold cursor-pointer select-none",
    "transition-all duration-200 ease-in-out",
    "border shadow-sm",
    "outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
    "disabled:cursor-not-allowed",
  ].join(" "),
  variants: {
    shape: {
      square: "w-[70px] h-[70px] rounded-xl",
      circle: "w-[70px] h-[70px] rounded-full",
      rect: "w-[100px] h-[60px] rounded-xl",
    },
    status: {
      // โทนปกติ + hover accent emerald
      available: [
        "bg-white/5 text-white",
        "border-white/15",
        "hover:scale-[1.04]",
        "hover:border-emerald-400/70",
        "hover:shadow-lg hover:shadow-emerald-500/30",
        "active:scale-[0.97]",
      ].join(" "),
      // จองแล้ว (แดง)
      reserved: [
        "bg-danger-500/10 text-danger-200",
        "border-danger-500/30",
        "opacity-70 pointer-events-none",
      ].join(" "),
      // รอคอนเฟิร์ม (เหลือง)
      pending: [
        "bg-amber-500/10 text-amber-200",
        "border-amber-500/30",
        "opacity-80 pointer-events-none",
        "animate-pulse",
      ].join(" "),
    },
    isSelected: {
      true: [
        "scale-105",
        "bg-gradient-to-br from-emerald-500/30 via-teal-500/25 to-lime-400/25",
        "border-emerald-400",
        "shadow-lg shadow-emerald-500/40",
        "ring-2 ring-emerald-300/60",
      ].join(" "),
      false: "",
    },
  },
  compoundVariants: [
    // ถ้าถูกเลือกแต่สถานะไม่พร้อมใช้งาน ให้ ring ตามสีสถานะ
    {
      status: "reserved",
      isSelected: true,
      class: "ring-2 ring-danger/60 shadow-danger/30",
    },
    {
      status: "pending",
      isSelected: true,
      class: "ring-2 ring-amber-400/60 shadow-amber-400/30",
    },
    // ลดเด้งเมื่อเลือกอยู่แล้ว
    { status: "available", isSelected: true, class: "hover:scale-105" },
  ],
  defaultVariants: {
    shape: "square",
    status: "available",
    isSelected: false,
  },
});
