import { redirect } from "next/navigation";
import { OfficialsLoginForm } from "@/components/officials-login-form";
import { isOfficial } from "@/lib/officials-auth";

export default async function OfficialsLoginPage() {
  if (await isOfficial()) redirect("/officials");

  return (
    <div className="mx-auto w-full max-w-sm px-4 pb-16 pt-12 sm:px-6">
      <div className="rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Records officials</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">Log in</h2>
        <p className="mt-2 text-sm text-muted">Enter the officials&rsquo; password to review record submissions.</p>
        <OfficialsLoginForm />
      </div>
    </div>
  );
}
