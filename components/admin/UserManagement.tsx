import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "@heroui/alert";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Pagination } from "@heroui/pagination";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Select, SelectItem } from "@heroui/select";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";

import { useNotification } from "@/lib/NotificationContext";

const AdminIcon = () => (
  <svg
    fill="currentColor"
    height="18"
    viewBox="0 0 24 24"
    width="18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Z" />
  </svg>
);

const StaffIcon = () => (
  <svg
    fill="currentColor"
    height="18"
    viewBox="0 0 24 24"
    width="18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
  </svg>
);

const UserIcon = () => (
  <svg
    fill="currentColor"
    height="18"
    viewBox="0 0 24 24"
    width="18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
  </svg>
);

const roleConfig = {
  admin: {
    icon: <AdminIcon />,
    chip: {
      color: "secondary" as const,
      className: "bg-indigo-500/20 text-indigo-200 border-indigo-400/40",
    },
  },
  staff: {
    icon: <StaffIcon />,
    chip: {
      color: "primary" as const,
      className: "bg-sky-500/15 text-sky-200 border-sky-400/40",
    },
  },
  user: {
    icon: <UserIcon />,
    chip: {
      color: "default" as const,
      className: "bg-white/10 text-white/80 border-white/20",
    },
  },
};

const ROLE_LABELS = {
  admin: "ผู้ดูแลระบบ",
  staff: "ทีมงาน",
  user: "ผู้ใช้งาน",
} as const;

interface User {
  id: number;
  display_name: string;
  role: "admin" | "staff" | "user";
  picture_url?: string | null;
}

type SummaryChip = {
  label: string;
  value: string;
  color: "success" | "primary" | "secondary" | "warning" | "default";
};

const USERS_PER_PAGE = 10;

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(users.length / USERS_PER_PAGE)),
    [users.length],
  );

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      }

      const data = (await response.json()) as User[];
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleRoleChange = useCallback(
    async (userId: number, newRole: string | number) => {
      const role = String(newRole) as User["role"];
      const snapshot = [...users];

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: role } : user,
        ),
      );

      try {
        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.message || "ไม่สามารถอัปเดตสิทธิ์ผู้ใช้ได้",
          );
        }

        showNotification(
          "อัปเดตสำเร็จ",
          `ปรับสิทธิ์เป็น ${ROLE_LABELS[role]} แล้ว`,
          "success",
        );
      } catch (err) {
        setUsers(snapshot);
        showNotification(
          "เกิดข้อผิดพลาด",
          err instanceof Error ? err.message : "ไม่สามารถอัปเดตข้อมูลได้",
          "error",
        );
      }
    },
    [users, showNotification],
  );

  const roleOptions = useMemo(
    () =>
      (["admin", "staff", "user"] as User["role"][]).map((role) => ({
        key: role,
        label: ROLE_LABELS[role],
      })),
    [],
  );

  const summaryChips = useMemo<SummaryChip[]>(() => {
    const totals = users.reduce(
      (acc, user) => {
        acc[user.role] += 1;
        return acc;
      },
      { admin: 0, staff: 0, user: 0 },
    );

    return [
      {
        label: "ผู้ดูแลระบบ",
        value: `${totals.admin} คน`,
        color: "secondary",
      },
      {
        label: "ทีมงาน",
        value: `${totals.staff} คน`,
        color: "primary",
      },
      {
        label: "ผู้ใช้งาน",
        value: `${totals.user} คน`,
        color: "default",
      },
    ];
  }, [users]);

  const isInitialLoading = isLoading && !hasLoaded;

  const SummarySkeleton = () => (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-10 w-40 rounded-full bg-white/10"
        />
      ))}
    </div>
  );

  const SummaryChips = () => (
    <div className="flex flex-wrap gap-3">
      {summaryChips.map((chip) => (
        <Chip
          key={chip.label}
          color={chip.color}
          size="lg"
          variant="flat"
          className="border border-white/15 bg-white/10 text-white/85 backdrop-blur"
        >
          <span className="font-semibold">{chip.label}</span>{" "}
          <span className="text-white/60">·</span>{" "}
          <span className="font-medium text-white/90">{chip.value}</span>
        </Chip>
      ))}
    </div>
  );

  const renderUserList = () => {
    const paginatedUsers = users.slice(
      (page - 1) * USERS_PER_PAGE,
      page * USERS_PER_PAGE,
    );

    if (isLoading && users.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Spinner color="success" label="กำลังโหลดผู้ใช้งาน..." size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          color="danger"
          variant="flat"
          className="border border-rose-500/40 bg-rose-500/15 text-rose-100"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-lg font-semibold">โหลดข้อมูลไม่สำเร็จ</h3>
            <p className="text-sm">{error}</p>
            <Button
              color="danger"
              radius="full"
              variant="bordered"
              isDisabled={isLoading}
              onPress={fetchUsers}
            >
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </Alert>
      );
    }

    if (users.length === 0) {
      return (
        <Card className="border border-dashed border-white/20 bg-white/5 py-16 text-center text-white/70 shadow-none">
          <CardBody>
            <p className="text-base font-medium">
              ยังไม่มีผู้ใช้งานในระบบ ณ ขณะนี้
            </p>
            <p className="text-xs text-white/50">
              เมื่อมีผู้ใช้ลงทะเบียนจะแสดงข้อมูลที่นี่อัตโนมัติ
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <>
        <ScrollShadow className="space-y-4">
          {paginatedUsers.map((user) => {
            const config = roleConfig[user.role] ?? roleConfig.user;

            return (
              <Card
                key={user.id}
              className="overflow-hidden border border-white/10 bg-white/5 text-white backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
              shadow="md"
            >
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar
                    isBordered
                    radius="lg"
                    size="md"
                    icon={config.icon}
                    className="h-12 w-12 border-white/20 bg-black/50"
                    name={user.display_name}
                    src={
                      user.picture_url
                        ? `/api/image-proxy?url=${encodeURIComponent(user.picture_url)}`
                        : undefined
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {user.display_name}
                    </p>
                    <p className="text-xs text-white/50">ID: {user.id}</p>
                    <Chip
                      size="sm"
                      variant="flat"
                      className={`w-fit border ${config.chip.className}`}
                    >
                      {ROLE_LABELS[user.role]}
                    </Chip>
                  </div>
                </div>

                <Select
                  aria-label={`สิทธิ์ของ ${user.display_name}`}
                  selectedKeys={[user.role]}
                  disallowEmptySelection
                classNames={{
                  trigger:
                    "bg-white/10 border border-white/15 text-white rounded-2xl backdrop-blur-xl",
                  listbox: "bg-slate-900 text-white",
                  popoverContent:
                    "bg-slate-900/95 text-white border border-white/10 backdrop-blur-xl",
                }}
                  onSelectionChange={(keys) => {
                    const [newRole] = Array.from(keys as Set<React.Key>);

                    if (newRole && newRole !== user.role) {
                      handleRoleChange(user.id, String(newRole));
                    }
                  }}
                >
                  {roleOptions.map((option) => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>
              </CardBody>
            </Card>
          );
        })}
        </ScrollShadow>
        {users.length > USERS_PER_PAGE ? (
          <div className="flex justify-center pt-4">
            <Pagination
              color="secondary"
              page={page}
              radius="full"
              showControls
              total={totalPages}
              variant="flat"
              classNames={{
                item: "bg-white/10 text-white border border-white/15",
                cursor: "bg-purple-500 text-white border-0",
              }}
              onChange={setPage}
            />
          </div>
        ) : null}
      </>
    );
  };

  if (isInitialLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl space-y-6 text-white">
        <Card className="border border-white/10 bg-gradient-to-br from-purple-500/15 via-slate-900/60 to-slate-950/90">
          <CardBody className="space-y-6 px-8 py-10">
            <div className="space-y-3">
              <Skeleton className="h-4 w-36 rounded-full bg-white/10" />
              <Skeleton className="h-8 w-72 rounded-full bg-white/10" />
              <Skeleton className="h-6 w-96 rounded-full bg-white/10" />
            </div>
            <SummarySkeleton />
            <div className="flex items-center gap-3 pt-4 text-sm text-white/70">
              <Spinner color="secondary" size="sm" />
              กำลังโหลดข้อมูลผู้ใช้งานจากระบบ...
            </div>
          </CardBody>
        </Card>

        <Card className="border border-white/10 bg-white/5 py-16 text-center text-white/70">
          <CardBody className="space-y-3">
            <Spinner color="secondary" size="lg" />
            <p className="text-sm">กำลังเตรียมรายชื่อผู้ใช้งาน...</p>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-white">
      <Card className="border border-white/10 bg-gradient-to-br from-purple-500/15 via-slate-900/60 to-slate-950/90 text-white">
        <CardBody className="space-y-6 px-8 py-10">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">
              จัดการสิทธิ์และบทบาทผู้ใช้งาน
            </h1>
            <p className="max-w-2xl text-sm text-white/75">
              ตรวจสอบรายชื่อสมาชิก ปรับบทบาทให้เหมาะสมกับหน้าที่
              พร้อมอัปเดตการเข้าถึงฟีเจอร์ของระบบแบบเรียลไทม์
            </p>
          </div>

          {isLoading ? <SummarySkeleton /> : <SummaryChips />}

          <Divider className="border-white/10" />

          <div className="flex flex-wrap items-center gap-4 text-xs text-white/65">
            <span>
              การปรับสิทธิ์จะมีผลทันทีและถูกบันทึกไว้ในระบบตรวจสอบย้อนหลัง
            </span>
            <Button
              color="secondary"
              radius="full"
              variant="bordered"
              isDisabled={isLoading}
              onPress={fetchUsers}
            >
              รีเฟรชรายการล่าสุด
            </Button>
          </div>
        </CardBody>
      </Card>

      {renderUserList()}
    </section>
  );
};
