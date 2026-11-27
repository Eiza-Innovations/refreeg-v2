import type { Metadata } from "next";

import { WishlistReceived } from "@/components/wishlist/wishlist-received";

// The checkout callback lands here from both providers; giving stays a
// private share-link surface, so this confirmation is noindex too.
export const metadata: Metadata = {
  title: "Gift confirmation",
  robots: { index: false, follow: false },
};

interface ReceivedPageProps {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{
    reference?: string;
    tx_ref?: string;
    transaction_id?: string;
    provider?: string;
    status?: string;
  }>;
}

export default async function WishlistReceivedPage({
  params,
  searchParams,
}: ReceivedPageProps) {
  const { username, slug } = await params;
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-cream">
      <WishlistReceived
        username={username}
        slug={slug}
        reference={query.reference}
        txRef={query.tx_ref}
        transactionId={query.transaction_id}
        provider={query.provider}
        cancelled={query.status === "cancelled"}
      />
    </main>
  );
}
