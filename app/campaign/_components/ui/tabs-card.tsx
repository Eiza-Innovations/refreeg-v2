import { motion } from "framer-motion";
import { MessagesSquare, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Heading, P, Span } from "@/components/marketing/Typography";
import type { CauseDetail, TabKey } from "@/types/campaign-view-types";
import { TABS, DEFAULT_FAQS, fadeUp } from "@/lib/causes/campaign-constants";
import type { Comment } from "@/types/common-types";

const CommentsSection = dynamic(
  () =>
    import("@/components/comments/comment-section").then(
      (mod) => mod.CommentsSection,
    ),
  { loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

export function TabsCard({
  cause,
  comments,
  currentUserId,
  activeTab,
  setActiveTab,
}: {
  cause: CauseDetail;
  formattedDate: string;
  comments: Comment[];
  currentUserId?: string;
  activeTab: TabKey;
  setActiveTab: (value: TabKey) => void;
}) {
  const commentCount = comments.length;

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-hairline bg-surface sm:rounded-[20px]"
      variants={fadeUp}
    >
      <div className="border-b border-hairline px-4 py-4 sm:hidden">
        <select
          className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabKey)}
        >
          {TABS.map((tab) => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden items-center gap-1 overflow-x-auto border-b border-hairline px-6 py-4 sm:flex">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
              activeTab === tab
                ? "bg-ink text-ink-foreground"
                : "text-ink/60 hover:bg-bone hover:text-ink"
            }`}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-7">
        {activeTab === "Comments" && (
          <div className="rounded-2xl bg-bone p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <MessagesSquare className="h-4 w-4 text-forest" />
              <Span className="text-sm text-ink/70">
                {commentCount} comments
              </Span>
            </div>
            <div className="mt-4">
              <CommentsSection
                comments={comments}
                causeId={cause.id}
                currentUserId={currentUserId}
                entityType="cause"
              />
            </div>
          </div>
        )}

        {activeTab === "FAQ" && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Heading as="h3" size="panel" className="font-medium">
              Frequently Asked Questions
            </Heading>
            <div className="space-y-3">
              {(cause.faqs && cause.faqs.length > 0
                ? cause.faqs
                : DEFAULT_FAQS
              ).map((faq, idx) => (
                <details
                  key={idx}
                  className="rounded-xl border border-hairline bg-surface p-4"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-ink">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 text-ink/50" />
                  </summary>
                  <P className="mt-2 text-ink/70 md:text-sm">{faq.answer}</P>
                </details>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
