// fixcy/components/booking/BookingStepper.tsx
import React from "react";
import clsx from "clsx";

const CheckIcon = () => (
  <svg height="14" viewBox="0 0 24 24" width="14">
    <path
      d="M20 6L9 17l-5-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
  </svg>
);

interface Step {
  step: number;
  title: string;
  description: string;
}

interface BookingStepperProps {
  currentStep: number;
}

const steps: Step[] = [
  {
    step: 1,
    title: "เลือกโต๊ะ",
    description: "เลือกโซนและจำนวนที่นั่งที่ต้องการ",
  },
  {
    step: 2,
    title: "ตรวจสอบ & ชำระ",
    description: "ยืนยันรายละเอียดและชำระค่ามัดจำ",
  },
  {
    step: 3,
    title: "รอยืนยัน",
    description: "ทีมงานตรวจสอบสลิปและยืนยันการจอง",
  },
];

export const BookingStepper: React.FC<BookingStepperProps> = ({
  currentStep,
}) => {
  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/2 px-6 py-6 backdrop-blur">
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.step < currentStep;
            const isActive = step.step === currentStep;

            return (
              <React.Fragment key={step.step}>
                {index !== 0 && (
                  <div
                    className={clsx(
                      "mx-4 hidden h-px flex-1 sm:block",
                      isCompleted
                        ? "bg-linear-to-r from-purple-500 via-fuchsia-500 to-amber-400"
                        : "bg-white/10",
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div
                    className={clsx(
                      "flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300",
                      {
                        "border-purple-500/80 bg-linear-to-br from-purple-500 via-fuchsia-500 to-amber-400 text-white shadow-lg shadow-purple-500/40":
                          isCompleted,
                        "border-purple-400/60 bg-purple-500/20 text-white shadow-md shadow-purple-500/30":
                          isActive,
                        "border-white/10 bg-white/4 text-zinc-400":
                          !isCompleted && !isActive,
                      },
                    )}
                  >
                    {isCompleted ? (
                      <CheckIcon />
                    ) : (
                      step.step.toString().padStart(2, "0")
                    )}
                  </div>
                  <div className="space-y-1">
                    <p
                      className={clsx("text-sm font-semibold ", {
                        "text-white": isActive,
                        "text-zinc-300": !isActive,
                      })}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-zinc-500">{step.description}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 sm:hidden">
          {steps.map((step) => {
            const isCompleted = step.step < currentStep;
            const isActive = step.step === currentStep;

            return (
              <div
                key={step.step}
                className={clsx(
                  "flex items-center gap-4 rounded-2xl border px-4 py-3",
                  isActive
                    ? "border-purple-500/60 bg-purple-500/15"
                    : "border-white/10 bg-white/3",
                )}
              >
                <div
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                    {
                      "border-purple-500/80 bg-linear-to-br from-purple-500 via-fuchsia-500 to-amber-400 text-white shadow-md shadow-purple-500/40":
                        isCompleted,
                      "border-purple-400/60 bg-purple-500/20 text-white":
                        isActive,
                      "border-white/10 bg-white/5 text-zinc-400":
                        !isCompleted && !isActive,
                    },
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    step.step.toString().padStart(2, "0")
                  )}
                </div>
                <div>
                  <p
                    className={clsx("text-sm font-semibold", {
                      "text-white": isActive,
                      "text-zinc-300": !isActive,
                    })}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-zinc-500">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
