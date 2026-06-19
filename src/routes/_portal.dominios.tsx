import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/dominios")({
  loader: async () => {
    throw redirect({ to: "/cliente/dominios" });
  },
});
