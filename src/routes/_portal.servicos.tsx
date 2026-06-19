import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/servicos")({
  loader: async () => {
    throw redirect({ to: "/cliente/servicos" });
  },
});
