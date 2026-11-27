"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Settings } from "lucide-react";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { initialsOf, socials } from "@/components/profile/profile-display";

interface ProfileHeaderProps {
  displayName: string;
  username: string;
  bio: string;
  profileImage: string | null;
  isVerified: boolean;
  isOwner: boolean;
  profile: any;
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  profileImage,
  isVerified,
  isOwner,
  profile,
}: ProfileHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      {profileImage ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-hairline bg-bone shadow-flat sm:h-24 sm:w-24">
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
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-bone shadow-flat sm:h-24 sm:w-24">
          <span className="font-fraunces text-2xl font-medium text-ink/70">
            {initialsOf(displayName)}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="font-fraunces text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {displayName}
          </h1>
          {isVerified && (
            <span
              aria-label="Verified"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-surface"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {username && <p className="mt-0.5 text-sm text-ink/55">@{username}</p>}
        {bio && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/70">{bio}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1.5">
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-bone text-ink/70 transition-colors hover:bg-surface hover:text-ink"
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
        {isOwner && (
          <Link
            href="/dashboard/settings/profile"
            aria-label="Manage profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink/60 transition-colors hover:border-ink/30 hover:text-ink"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
