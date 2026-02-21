import type { GetServerSideProps } from "next";

export default function ProfileTicketsRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/profile",
    permanent: false,
  },
});
