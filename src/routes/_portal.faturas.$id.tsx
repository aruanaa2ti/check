import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/faturas/$id")({
  loader: async ({ params }) => {
    throw redirect({ to: "/cliente/faturas/$id", params: { id: params.id } });
  },
});
