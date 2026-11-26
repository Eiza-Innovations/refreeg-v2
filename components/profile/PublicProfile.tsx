"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  CircleCheck,
  FileText,
  Gift,
  HandCoins,
  Settings,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";
import { Instagram, Facebook, Linkedin } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNaira } from "@/components/giving/format";
import { goalPercent } from "@/lib/progress";
import { causePublicPath } from "@/lib/causes/slug";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { PublicWishlistSummary } from "@/actions/wishlists/wishlist-actions";

type ProfileProps = {
  profile: any;
  causes: any[];
  donations: any[];
  petitions: any[];
  wishlists: PublicWishlistSummary[];
  userId: string;
  /** The username this page was opened with — the canonical share prefix. */
  username: string;
  isOwner: boolean;
};

type TabId = "causes" | "donations" | "petitions" | "wishlists";

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${amount.toLocaleString()}`;
}

function formatCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const socials = [
  { key: "instagram_url", label: "Instagram", Icon: Instagram },
  { key: "twitter_url", label: "X (Twitter)", Icon: FaXTwitter },
  { key: "facebook_url", label: "Facebook", Icon: Facebook },
  { key: "linkedin_url", label: "LinkedIn", Icon: Linkedin },
] as const;

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function PublicProfile({
  profile,
  causes,
  donations,
  petitions,
  wishlists,
  username,
  isOwner,
}: ProfileProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("causes");

  const displayName: string = profile.full_name || "Anonymous";
  const firstName = displayName.split(" ")[0] || "this user";
  const isVerified = !!profile.is_verified;
  const profileImage = getMediaUrl(profile.profile_photo);
  const bio: string = profile.bio?.trim() || "";

  const causesCount = causes.length;
  const donationsCount = donations.length;
  const petitionsCount = petitions.length;
  const wishlistsCount = wishlists.length;

  const totalRaisedAcrossCauses = causes.reduce(
    (sum, c) => sum + (Number(c.raised) || 0),
    0,
  );
  const totalDonated = donations.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0,
  );
  const totalSignaturesGathered = petitions.reduce(
    (sum, p) => sum + (Number(p.signatures ?? p.signature_count) || 0),
    0,
  );
  const activeCauses = causes.filter(
    (c) => !c.ended && (Number(c.raised) || 0) < (Number(c.goal) || 1),
  ).length;

  const impactMetrics = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Total raised",
      value: formatCompact(totalRaisedAcrossCauses),
      sub: `across ${causesCount} ${causesCount === 1 ? "cause" : "causes"}`,
      chip: "bg-forest/10 text-forest",
    },
    {
      icon: <HandCoins className="h-4 w-4" />,
      label: "Donated",
      value: formatCompact(totalDonated),
      sub: `${donationsCount} ${donationsCount === 1 ? "contribution" : "contributions"}`,
      chip: "bg-cyan/15 text-cyan-800",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Signatures",
      value: formatCount(totalSignaturesGathered),
      sub: `from ${petitionsCount} ${petitionsCount === 1 ? "petition" : "petitions"}`,
      chip: "bg-gold/20 text-ink",
    },
    {
      icon: <Globe className="h-4 w-4" />,
      label: "Active causes",
      value: String(activeCauses),
      sub: "currently fundraising",
      chip: "bg-ink/5 text-ink",
    },
  ];

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "causes", label: "Causes", count: causesCount },
    { id: "donations", label: "Donations", count: donationsCount },
    { id: "petitions", label: "Petitions", count: petitionsCount },
    // The tab only appears when there is something to show, so visitors
    // never land on a wishlists view with nothing in it.
    ...(wishlistsCount > 0
      ? [
          {
            id: "wishlists" as TabId,
            label: "Wishlists",
            count: wishlistsCount,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen w-full bg-cream">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink/60 transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Profile header */}
        <Card variant="surface" className="shadow-none">
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {profileImage ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-hairline bg-bone shadow-flat">
                  <Image
                    src={profileImage}
                    alt={`${displayName}'s profile picture`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority
                    unoptimized={isProxyMediaUrl(profileImage)}
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-bone shadow-flat">
                  <span className="font-fraunces text-2xl font-medium text-ink/70">
                    {initialsOf(displayName)}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-fraunces text-3xl font-medium tracking-tight text-ink">
                    {displayName}
                  </h1>
                  {isVerified && (
                    <Badge
                      variant="verified"
                      className="gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                {username && (
                  <p className="mt-0.5 text-sm text-ink/55">@{username}</p>
                )}
                {bio ? (
                  <p className="mt-3 max-w-xl text-sm leading-6 text-ink/70">
                    {bio}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-ink/50">No bio yet.</p>
                )}

                {socials.some(({ key }) => !!profile[key]) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {socials.map(({ key, label, Icon }) => {
                      const href: string | undefined = profile[key];
                      if (!href) return null;
                      return (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={label}
                          aria-label={label}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-bone text-ink/70 transition-colors hover:bg-surface hover:text-ink"
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}
                    <a
                      href="https://t.me/+ibsgFy6SL0AwYmE8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-accent hover:underline"
                    >
                      <Users className="h-3.5 w-3.5" />
                      RefreeG community
                    </a>
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button
                    variant="surface"
                    className="h-10 rounded-lg border-hairline px-4 text-sm font-semibold"
                    asChild
                  >
                    <Link href="/dashboard/settings/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage profile
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Impact metrics */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {impactMetrics.map((metric) => (
            <Card key={metric.label} variant="surface" className="shadow-none">
              <CardContent className="p-4 sm:p-5">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${metric.chip}`}
                >
                  {metric.icon}
                </span>
                <p className="mt-3 font-fraunces text-2xl font-medium tracking-tight text-ink">
                  {metric.value}
                </p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink/60">
                  {metric.label}
                </p>
                <p className="mt-0.5 text-xs text-ink/50">{metric.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-hairline">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                aria-current={tab === entry.id ? "true" : undefined}
                className={`-mb-px flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === entry.id
                    ? "border-b-2 border-ink text-ink"
                    : "border-b-2 border-transparent text-ink/50 hover:text-ink/80"
                }`}
              >
                {entry.label}
                {entry.count > 0 && (
                  <span className="rounded-full bg-bone px-2 py-0.5 text-xs font-bold text-ink/70">
                    {entry.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {tab === "causes" &&
              (causesCount === 0 ? (
                <TabEmptyState
                  title="No causes yet"
                  description={`${firstName} hasn't started a cause yet. Stay tuned for their first impact story.`}
                  cta="Explore causes"
                  href="/causes"
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {causes.map((cause) => {
                    const raised = Number(cause.raised) || 0;
                    const goal = Number(cause.goal) || 0;
                    const percent = goalPercent(raised, goal);
                    const image = getMediaUrl(cause.image);
                    return (
                      <Card
                        key={cause.id}
                        variant="surface"
                        className="shadow-none"
                      >
                        <CardContent className="p-0">
                          <Link href={causePublicPath(cause)}>
                            <div className="relative aspect-[2.15/1] w-full overflow-hidden rounded-t-2xl bg-bone">
                              {image && (
                                <Image
                                  src={image}
                                  alt={cause.title}
                                  fill
                                  sizes="(max-width: 640px) 100vw, 400px"
                                  className="object-cover"
                                  unoptimized={isProxyMediaUrl(image)}
                                />
                              )}
                            </div>
                          </Link>
                          <div className="space-y-3 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant="cyan"
                                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              >
                                {cause.category || "Cause"}
                              </Badge>
                              {percent >= 100 && (
                                <Badge
                                  variant="forest"
                                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                >
                                  Funded
                                </Badge>
                              )}
                            </div>
                            <Link
                              href={causePublicPath(cause)}
                              className="block line-clamp-2 font-semibold text-ink hover:text-forest"
                            >
                              {cause.title}
                            </Link>
                            <div>
                              <Progress
                                value={percent}
                                indicatorVariant="forest"
                                className="h-2 border border-hairline"
                                aria-label={`${cause.title}, ${percent} percent funded`}
                              />
                              <p className="mt-2 text-sm text-ink/70">
                                {formatNaira(raised)}{" "}
                                <span className="text-ink/45">
                                  of {formatNaira(goal)} · {percent}%
                                </span>
                              </p>
                            </div>
                            <Link
                              href={causePublicPath(cause)}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-accent hover:underline"
                            >
                              View cause
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}

            {tab === "donations" &&
              (donationsCount === 0 ? (
                <TabEmptyState
                  title="No donations yet"
                  description={`${firstName} hasn't donated to any causes yet.`}
                  cta="Explore causes"
                  href="/causes"
                />
              ) : (
                <ul className="space-y-3">
                  {donations.map((donation) => (
                    <li
                      key={donation.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-hairline bg-surface p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={causePublicPath({
                            id: donation.cause_id,
                            slug: donation.cause?.slug,
                          })}
                          className="block truncate font-semibold text-ink hover:text-forest"
                        >
                          {donation.cause?.title || "Unknown cause"}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink/55">
                          {donation.is_anonymous
                            ? "Anonymous gift"
                            : donation.name}{" "}
                          · {formatDate(donation.created_at)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-ink">
                        {formatNaira(Number(donation.amount) || 0)}
                      </p>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "petitions" &&
              (petitionsCount === 0 ? (
                <TabEmptyState
                  title="No petitions yet"
                  description={`${firstName} hasn't created any petitions yet.`}
                  cta="Explore petitions"
                  href="/petitions"
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {petitions.map((petition) => {
                    const image = getMediaUrl(petition.image);
                    const signatures =
                      Number(petition.signatures ?? petition.signature_count) ||
                      0;
                    return (
                      <Card
                        key={petition.id}
                        variant="surface"
                        className="shadow-none"
                      >
                        <CardContent className="p-0">
                          <Link href={`/petitions/${petition.id}`}>
                            <div className="relative aspect-[2.15/1] w-full overflow-hidden rounded-t-2xl bg-bone">
                              {image && (
                                <Image
                                  src={image}
                                  alt={petition.title}
                                  fill
                                  sizes="(max-width: 640px) 100vw, 400px"
                                  className="object-cover"
                                  unoptimized={isProxyMediaUrl(image)}
                                />
                              )}
                            </div>
                          </Link>
                          <div className="space-y-3 p-4 sm:p-5">
                            <Badge
                              variant="cyan"
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            >
                              {petition.category || "Petition"}
                            </Badge>
                            <Link
                              href={`/petitions/${petition.id}`}
                              className="block line-clamp-2 font-semibold text-ink hover:text-forest"
                            >
                              {petition.title}
                            </Link>
                            <p className="flex items-center gap-1.5 text-sm text-ink/60">
                              <FileText className="h-3.5 w-3.5" />
                              {signatures.toLocaleString()}{" "}
                              {signatures === 1 ? "signature" : "signatures"}
                            </p>
                            <Link
                              href={`/petitions/${petition.id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-accent hover:underline"
                            >
                              View petition
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}

            {tab === "wishlists" &&
              (wishlistsCount === 0 ? null : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {wishlists.map((wishlist) => {
                    const percent =
                      wishlist.target_total > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (wishlist.contributed_total /
                                wishlist.target_total) *
                                100,
                            ),
                          )
                        : 0;
                    return (
                      <Card
                        key={wishlist.id}
                        variant="surface"
                        className="shadow-none"
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/${username}/${wishlist.slug}`}
                                className="block truncate text-base font-semibold text-ink hover:text-forest"
                              >
                                {wishlist.title}
                              </Link>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/55">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(wishlist.created_at)}
                              </p>
                            </div>
                            <Badge
                              variant="forest"
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            >
                              Active
                            </Badge>
                          </div>

                          <p className="mt-4 text-sm text-ink/70">
                            {formatNaira(wishlist.contributed_total)}{" "}
                            <span className="text-ink/45">
                              of {formatNaira(wishlist.target_total)} across{" "}
                              {wishlist.item_count}{" "}
                              {wishlist.item_count === 1 ? "item" : "items"}
                            </span>
                          </p>
                          <Progress
                            value={percent}
                            indicatorVariant="forest"
                            className="mt-2 h-2 border border-hairline"
                            aria-label={`${wishlist.title}, ${percent} percent funded`}
                          />
                          {wishlist.funded_count > 0 && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-forest">
                              <CircleCheck className="h-3.5 w-3.5" />
                              {wishlist.funded_count}{" "}
                              {wishlist.funded_count === 1 ? "item" : "items"}{" "}
                              fully funded
                            </p>
                          )}

                          <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-4">
                            <Link
                              href={`/${username}/${wishlist.slug}`}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-accent hover:underline"
                            >
                              <Gift className="h-4 w-4" />
                              View wishlist
                            </Link>
                            <span className="text-xs text-ink/55">
                              {percent}% funded
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabEmptyState({
  title,
  description,
  cta,
  href,
}: {
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-bone px-5 py-14 text-center">
      <h3 className="font-fraunces text-xl font-medium text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/70">
        {description}
      </p>
      <Button variant="ink" className="mt-6 h-11 rounded-lg px-5" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
