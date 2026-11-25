import { getPetition } from "@/actions/petitions/petition-actions";
import { auth } from "@/lib/auth/auth";
import { getProfile } from "@/actions/users/profile-actions";
import {
  listSignaturesForPetition,
  checkUserSignature,
} from "@/actions/petitions/signature-actions";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getBaseURL } from "@/lib/utils";
import { SignatureForm } from "@/components/engagement/SignatureForm";
import { SignersList } from "@/components/engagement/SignersList";
import { CommentsSection } from "@/components/comments/comment-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PetitionHeader } from "@/components/petitions/detail/petition-header";
import { PetitionMedia } from "@/components/petitions/detail/petition-media";
import { PetitionProgressCard } from "@/components/petitions/detail/petition-progress-card";
import { PetitionStory } from "@/components/petitions/detail/petition-story";
import { parseSocialLinks } from "@/lib/petitions/social-links";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!isUuid(id)) notFound();

  const petition = await getPetition(id);

  if (!petition) {
    return {
      title: "Petition Not Found",
    };
  }

  return {
    title: petition.title,
    description: petition.description?.substring(0, 160),
    openGraph: {
      title: petition.title,
      description: petition.description?.substring(0, 160),
      images: petition.image ? [{ url: petition.image }] : [],
    },
  };
}

export default async function PetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) notFound();

  const [petition, initialSigners, session] = await Promise.all([
    getPetition(id),
    listSignaturesForPetition(id),
    auth(),
  ]);

  const user = session?.user;

  if (!petition) {
    notFound();
  }

  const [commentsResult, myProfile, hasSigned, creatorProfile] =
    await Promise.all([
      (async () => {
        try {
          const { listPetitionComments } =
            await import("@/actions/petitions/petition-comment-actions");
          return await listPetitionComments(petition.id);
        } catch (e) {
          return [];
        }
      })(),
      user ? getProfile(user.id as string) : Promise.resolve(undefined),
      user
        ? checkUserSignature(petition.id, user.id as string)
        : Promise.resolve(false),
      getProfile(petition.user_id),
    ]);

  const signers = initialSigners;
  const amount = signers.reduce(
    (total: number, s: any) => total + (s.amount || 0),
    0,
  );
  const comments = commentsResult;

  const signerMessages = (signers || [])
    .filter((s: any) => s.message && String(s.message).trim() !== "")
    .map((s: any) => ({
      id: `signer-${s.id}`,
      cause_id: petition.id,
      user_id: s.user_id || "anonymous",
      content: s.message || "",
      created_at: s.created_at,
      updated_at: s.created_at,
      is_edited: false,
      parent_id: null,
      user: {
        full_name: s.name || "Anonymous",
        profile_photo: null,
      },
      replies: [],
      replies_count: 0,
    }));

  const mergedComments = [...comments, ...signerMessages].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Format the date
  const formattedDate = new Date(petition.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  // Calculate days left from creation date + active duration
  const daysLeft =
    petition.days_active != null
      ? Math.max(
          0,
          petition.days_active -
            Math.floor(
              (Date.now() - new Date(petition.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
        )
      : null;

  const profile = {
    email: myProfile?.email || "",
    name: myProfile?.full_name || "",
    id: myProfile?.id || "",
    subaccount: myProfile?.sub_account_code || "",
  };

  const baseUrl = getBaseURL();
  const creatorUsername = creatorProfile?.username;

  const socials = parseSocialLinks(creatorProfile?.social_media);
  const multimedia: string[] = Array.isArray(petition.multimedia)
    ? petition.multimedia
    : [];
  const videoLinks: string[] = Array.isArray(petition.video_links)
    ? petition.video_links
    : [];

  return (
    <div className="bg-cream">
      <div className="container grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-12">
        <div className="min-w-0 space-y-8">
          <PetitionHeader
            title={petition.title}
            category={petition.category}
            createdAt={petition.created_at}
            creatorName={petition.user?.name}
            creatorHref={
              creatorUsername
                ? `/${creatorUsername}`
                : `/profile/${petition.user_id}`
            }
            status={petition.status}
            socials={socials}
          />
          <PetitionMedia
            title={petition.title}
            cover={petition.image}
            media={[...multimedia, ...videoLinks]}
          />

          <Tabs defaultValue="about">
            <TabsList variant="pill">
              <TabsTrigger value="about" variant="pill">
                About
              </TabsTrigger>
              <TabsTrigger value="signers" variant="pill">
                Signatures ({amount.toLocaleString()})
              </TabsTrigger>
              <TabsTrigger value="comments" variant="pill">
                Comments ({mergedComments.length.toLocaleString()})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="mt-6">
              <PetitionStory
                description={petition.description}
                sections={petition.sections}
                videoLinks={videoLinks}
              />
            </TabsContent>
            <TabsContent value="signers" className="mt-6">
              <SignersList
                signers={signers}
                petitionTitle={petition.title}
                goal={petition.goal}
              />
            </TabsContent>
            <TabsContent value="comments" className="mt-6 space-y-4">
              <CommentsSection
                comments={mergedComments as any}
                causeId={petition.id}
                currentUserId={user?.id}
                entityType="petition"
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <PetitionProgressCard
            petitionId={petition.id}
            title={petition.title}
            url={`${baseUrl}/petitions/${petition.id}`}
            signatures={amount}
            goal={petition.goal}
            daysLeft={daysLeft}
          />
          <SignatureForm
            petitionId={petition.id}
            profile={profile}
            status={petition.status}
            subaccount={petition?.user?.sub_account_code}
            hasSigned={hasSigned}
            petitionData={{
              title: petition.title,
              creatorId: petition.user_id,
              creatorEmail: creatorProfile?.email || undefined,
              creatorName: petition.user?.name,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
