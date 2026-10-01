import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — MediScan AI" },
      { name: "description", content: "Log in to your MediScan AI account." },
      { property: "og:title", content: "Log in — MediScan AI" },
      { property: "og:description", content: "Log in to your MediScan AI account." },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
