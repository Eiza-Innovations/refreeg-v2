import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getOrganizationVerification } from "@/actions/users/organization-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading, P } from "@/components/marketing/Typography";
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
        <Heading as="h1" size="subsection" className="mt-2 font-medium">
          Verify your organisation
        </Heading>
        <P className="mt-3 text-ink/70">
          Upload your registration documents and director IDs. Reviews take
          about 2 working days.
        </P>

        {result.success ? (
          <VerificationForm
            verificationStatus={result.verificationStatus}
            submission={result.submission}
          />
        ) : (
          <Card variant="surface" className="mt-8">
            <CardContent className="p-6">
              <P className="text-ink/70 md:text-sm">{result.error}</P>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
