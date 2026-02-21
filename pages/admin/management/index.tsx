// fixcy/pages/admin/management/index.tsx
import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";

import DefaultLayout from "@/layouts/default";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { Dashboard } from "@/components/admin/Dashboard";

export default function AdminManagementHubPage() {
  return (
    <DefaultLayout>
      <div className="mt-8">
        <Dashboard />
      </div>
    </DefaultLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session || session.user?.role !== "admin") {
    return {
      redirect: {
        destination: "/profile",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
