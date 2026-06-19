import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/faturas")({
  loader: async () => {
    throw redirect({ to: "/cliente/faturas" });
  },
});
