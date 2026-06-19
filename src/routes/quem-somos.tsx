import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/quem-somos")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "quem-somos" });
  },
});
