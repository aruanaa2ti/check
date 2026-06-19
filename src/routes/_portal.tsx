import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { meFn } from "@/lib/portal.functions";

export const Route = createFileRoute("/_portal")({
  beforeLoad: async () => {
    const me = await meFn();
    if (!me) throw redirect({ to: "/cliente" });
    return { me };
  },
  component: () => <Outlet />,
});
