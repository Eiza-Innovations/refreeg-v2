"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface ProfilePetitionCardProps {
  petition: any;
}

export function ProfilePetitionCard({ petition }: ProfilePetitionCardProps) {
  const image = getMediaUrl(petition.image);
  const signatures =
    Number(petition.signatures ?? petition.signature_count) || 0;

  return (
    <Card variant="surface" className="shadow-none">
      <CardContent className="p-0">
        <Link href={`/petitions/${petition.id}`} className="group block">
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
          <div className="space-y-3 p-4 sm:p-5">
            <Badge
              variant="cyan"
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            >
              {petition.category || "Petition"}
            </Badge>
            <p className="line-clamp-2 font-semibold text-ink group-hover:text-forest">
              {petition.title}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-ink/60">
              <FileText className="h-3.5 w-3.5" />
              {signatures.toLocaleString()}{" "}
              {signatures === 1 ? "signature" : "signatures"}
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
