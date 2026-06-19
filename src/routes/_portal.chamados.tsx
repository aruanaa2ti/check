import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/chamados")({
  loader: async () => {
    throw redirect({ to: "/cliente/chamados" });
  },
});
