import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/dashboard")({
  loader: async () => {
    throw redirect({ to: "/cliente/dashboard" });
  },
});
