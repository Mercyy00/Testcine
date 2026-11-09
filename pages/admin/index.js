export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/admin/users",
      permanent: false,
    },
  };
}

export default function AdminIndexPage() {
  return null;
}
