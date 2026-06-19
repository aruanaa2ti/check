import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/meus-dados")({
  loader: async () => {
    throw redirect({ to: "/cliente/meus-dados" });
  },
});
