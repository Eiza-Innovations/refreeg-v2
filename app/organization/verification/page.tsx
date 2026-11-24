import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getOrganizationVerification } from "@/actions/users/organization-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { VerificationForm } from "./verification-form";

export default async function OrganizationVerificationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getOrganizationVerification();

  return (
    <div className="min-h-screen w-full bg-cream">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Eyebrow>Organisation verification</Eyebrow>
        <h1 className="mt-2 font-fraunces text-3xl font-medium text-ink sm:text-4xl">
          Verify your organisation
        </h1>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Upload your registration documents and director IDs. Reviews take
          about 2 working days.
        </p>

        {result.success ? (
          <VerificationForm
            verificationStatus={result.verificationStatus}
            submission={result.submission}
          />
        ) : (
          <Card variant="surface" className="mt-8">
            <CardContent className="p-6 text-sm text-ink/70">
              {result.error}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
