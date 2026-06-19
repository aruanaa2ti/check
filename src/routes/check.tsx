import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check | a2 Soluções em T.I." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Outlet />,
});
