import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — MediScan AI" },
      { name: "description", content: "Create a free MediScan AI account." },
      { property: "og:title", content: "Create account — MediScan AI" },
      { property: "og:description", content: "Create a free MediScan AI account." },
    ],
  }),
  component: () => <AuthForm mode="register" />,
});
