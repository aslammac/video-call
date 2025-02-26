import dynamic from "next/dynamic";

const ClientComponent = dynamic(() => import("@/components/Home"), {
  ssr: false,
});

export default ClientComponent;
