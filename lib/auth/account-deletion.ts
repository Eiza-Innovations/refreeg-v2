import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildAnonymizedEmail,
  DATA_RETENTION_POLICY,
} from "@/lib/config/retention";
import { getDiditApiKey, parseDiditSessionId } from "@/lib/didit";
import { deleteUserPersonalS3Files } from "@/lib/s3/s3-utils";
import { isUuid } from "@/lib/uuid";

export interface AccountDeletionResult {
  success: boolean;
  statusCode: number;
  error?: string;
  code?: string;
}

const DIDIT_BASE_URL = "https://verification.didit.me/v3";

/**
 * Attempts to delete any third-party Didit KYC sessions associated with the user
 * AFTER the database deletion has committed. Fails gracefully with warning logs.
 */
async function deleteDiditSessions(sessionIds: string[]): Promise<void> {
  const apiKey = getDiditApiKey();
  const uniqueSessionIds = Array.from(new Set(sessionIds));
  if (!apiKey || uniqueSessionIds.length === 0) return;

  await Promise.allSettled(
    uniqueSessionIds.map(async (sessionId) => {
      const response = await fetch(
        `${DIDIT_BASE_URL}/session/${encodeURIComponent(sessionId)}/`,
        {
          method: "DELETE",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok && response.status !== 404) {
        console.warn(
          `[deleteDiditSessions] Didit session ${sessionId} returned HTTP ${response.status}`,
        );
      }
    }),
  );
}

type TxPrepOutcome =
  | { ok: false; result: AccountDeletionResult }
  | {
      ok: true;
      diditSessionIds: string[];
      extraS3Keys: (string | null | undefined)[];
    };

/**
 * Executes compliant account deletion for both web and mobile:
 * 1. Acquires a row-level `FOR UPDATE` lock on `profiles` inside the DB transaction
 *    to serialize concurrent deletion requests and prevent TOCTOU races with incoming
 *    donations. Blocks deletion ONLY when an active, unpaused funded campaign exists.
 * 2. Anonymizes financial records (`Donation`, `crypto_donations`, `pledges`,
 *    `subscriptions`, `DonorReferralAttribution`, funded `api_campaigns`) case-insensitively.
 * 3. Deletes personal, developer webhook/bank, organization, token, and unfunded
 *    campaign/petition rows while unlinking `content_reports`.
 * 4. Hard-deletes the `User` row when no historical funded causes exist, or scrubs
 *    all PII columns and blocks/revokes sessions into a tombstone row otherwise.
 * 5. Only AFTER the DB transaction commits, purges owned S3 objects and Didit KYC sessions.
 */
export async function executeUserAccountDeletion(
  userId: string,
): Promise<AccountDeletionResult> {
  if (!userId) {
    return {
      success: false,
      statusCode: 400,
      error: "User ID is required",
      code: "MISSING_USER_ID",
    };
  }

  if (!isUuid(userId)) {
    return {
      success: false,
      statusCode: 400,
      error: "Invalid user ID format",
      code: "INVALID_USER_ID",
    };
  }

  try {
    const outcome: TxPrepOutcome = await prisma.$transaction(
      async (tx) => {
        // Lock the user row first so concurrent deletions or status changes serialize.
        await tx.$queryRaw`SELECT id FROM profiles WHERE id = ${userId}::uuid FOR UPDATE`;

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            profilePhoto: true,
          },
        });

        if (!user) {
          return {
            ok: false,
            result: {
              success: false,
              statusCode: 404,
              error: "Account not found",
              code: "USER_NOT_FOUND",
            },
          };
        }

        // 1. Check for active campaigns that currently have raised funds
        const activeFundedCause = await tx.cause.findFirst({
          where: {
            userId,
            status: "approved",
            paused: false,
            raised: { gt: 0 },
          },
          select: {
            id: true,
            title: true,
          },
        });

        if (activeFundedCause) {
          return {
            ok: false,
            result: {
              success: false,
              statusCode: 409,
              code: "ACTIVE_FUNDED_CAMPAIGN",
              error: `You have an active campaign with raised funds ("${activeFundedCause.title}"). Please pause or close your active campaign before deleting your account, or contact ${DATA_RETENTION_POLICY.SUPPORT_EMAIL} for assistance.`,
            },
          };
        }

        // 2. Gather KYC records, causes, petitions, organization, webhooks, and API campaigns
        const [
          kycRecords,
          userCauses,
          userPetitions,
          ownedOrganization,
          userWebhooks,
          userApiCampaigns,
        ] = await Promise.all([
          tx.kyc_verifications.findMany({
            where: { user_id: userId },
            select: { document_type: true, document_url: true },
          }),
          tx.cause.findMany({
            where: { userId },
            select: {
              id: true,
              image: true,
              multimedia: true,
              raised: true,
              _count: {
                select: {
                  donations: true,
                  crypto_donations: true,
                },
              },
            },
          }),
          tx.petitions.findMany({
            where: { user_id: userId },
            select: {
              id: true,
              image: true,
              multimedia: true,
            },
          }),
          tx.organization.findUnique({
            where: { ownerId: userId },
            select: { logoUrl: true },
          }),
          tx.api_webhooks.findMany({
            where: { user_id: userId },
            select: { id: true },
          }),
          tx.api_campaigns.findMany({
            where: { developer_id: userId },
            select: {
              id: true,
              raised_amount: true,
              _count: {
                select: {
                  api_campaign_reports: true,
                },
              },
            },
          }),
        ]);

        const userCauseIds = userCauses.map((c) => c.id);
        const apiCampaignIds = userApiCampaigns.map((c) => c.id);
        const [causePledges, causeSubscriptions, apiDonations] =
          await Promise.all([
            userCauseIds.length > 0
              ? tx.pledges.findMany({
                  where: { cause_id: { in: userCauseIds } },
                  select: { cause_id: true },
                  distinct: ["cause_id"],
                })
              : Promise.resolve([]),
            userCauseIds.length > 0
              ? tx.subscriptions.findMany({
                  where: { cause_id: { in: userCauseIds } },
                  select: { cause_id: true },
                  distinct: ["cause_id"],
                })
              : Promise.resolve([]),
            apiCampaignIds.length > 0
              ? tx.api_donations.findMany({
                  where: { api_campaign_id: { in: apiCampaignIds } },
                  select: { api_campaign_id: true },
                  distinct: ["api_campaign_id"],
                })
              : Promise.resolve([]),
          ]);

        const causesWithPledgesOrSubs = new Set<string>([
          ...causePledges.map((p) => p.cause_id),
          ...causeSubscriptions
            .map((s) => s.cause_id)
            .filter((id): id is string => Boolean(id)),
        ]);
        const apiCampaignsWithDonations = new Set<string>(
          apiDonations.map((d) => d.api_campaign_id),
        );

        const diditSessionIds: string[] = [];
        const extraS3Keys: (string | null | undefined)[] = [
          user.profilePhoto,
          ownedOrganization?.logoUrl,
        ];

        for (const kyc of kycRecords) {
          if (!kyc.document_url) continue;
          const parsedSessionId = parseDiditSessionId(kyc.document_url);
          if (parsedSessionId) {
            diditSessionIds.push(parsedSessionId);
          }
          if (
            kyc.document_type === "didit" &&
            kyc.document_url.includes(":::")
          ) {
            const [, docKey] = kyc.document_url.split(":::");
            if (docKey) extraS3Keys.push(docKey);
          } else if (!parsedSessionId) {
            extraS3Keys.push(kyc.document_url);
          }
        }

        const deletableCauseIds: string[] = [];
        const historicalFundedCauseIds: string[] = [];

        for (const cause of userCauses) {
          const hasFinancialHistory =
            Number(cause.raised ?? 0) > 0 ||
            cause._count.donations > 0 ||
            cause._count.crypto_donations > 0 ||
            causesWithPledgesOrSubs.has(cause.id);

          if (hasFinancialHistory) {
            historicalFundedCauseIds.push(cause.id);
          } else {
            deletableCauseIds.push(cause.id);
            extraS3Keys.push(cause.image);
            if (Array.isArray(cause.multimedia)) {
              for (const item of cause.multimedia) {
                if (typeof item === "string") {
                  extraS3Keys.push(item);
                }
              }
            }
          }
        }

        const deletableApiCampaignIds: string[] = [];
        const historicalApiCampaignIds: string[] = [];
        for (const apiCampaign of userApiCampaigns) {
          const hasHistory =
            Number(apiCampaign.raised_amount ?? 0) > 0 ||
            apiCampaignsWithDonations.has(apiCampaign.id) ||
            apiCampaign._count.api_campaign_reports > 0;
          if (hasHistory) {
            historicalApiCampaignIds.push(apiCampaign.id);
          } else {
            deletableApiCampaignIds.push(apiCampaign.id);
          }
        }

        const petitionIds = userPetitions.map((p) => p.id);
        for (const petition of userPetitions) {
          extraS3Keys.push(petition.image);
          for (const item of petition.multimedia ?? []) {
            extraS3Keys.push(item);
          }
        }

        const userEmail = user.email?.trim() || null;
        const emailInsensitive = userEmail
          ? { equals: userEmail, mode: "insensitive" as const }
          : undefined;
        const anonymizedEmail = buildAnonymizedEmail(userId);
        const anonymizedName =
          DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME;

        // 3a. Anonymize financial records (retained for audit/tax compliance without PII)
        await tx.donation.updateMany({
          where: {
            OR: [
              { userId },
              ...(emailInsensitive ? [{ email: emailInsensitive }] : []),
            ],
          },
          data: {
            userId: null,
            name: anonymizedName,
            email: anonymizedEmail,
            message: null,
            is_anonymous: true,
          },
        });

        await tx.crypto_donations.updateMany({
          where: { user_id: userId },
          data: {
            user_id: null,
            donor_wallet_address: null,
          },
        });

        await tx.pledges.updateMany({
          where: {
            OR: [
              { user_id: userId },
              ...(emailInsensitive ? [{ email: emailInsensitive }] : []),
            ],
          },
          data: {
            user_id: null,
            name: anonymizedName,
            email: anonymizedEmail,
            note: null,
            paystack_authorization_code: null,
            authorization_email: null,
          },
        });

        await tx.subscriptions.updateMany({
          where: { user_id: userId },
          data: {
            user_id: null,
            status: "cancelled",
          },
        });

        await tx.donorReferralAttribution.updateMany({
          where: {
            OR: [
              { donor_user_id: userId },
              ...(emailInsensitive ? [{ donor_email: emailInsensitive }] : []),
            ],
          },
          data: {
            donor_user_id: null,
            donor_email: anonymizedEmail,
          },
        });

        // 3b. Delete personal records, developer keys/webhooks, organizations, & tokens
        await tx.kyc_verifications.deleteMany({ where: { user_id: userId } });
        await tx.device_tokens.deleteMany({ where: { user_id: userId } });
        await tx.user_saved_cards.deleteMany({ where: { user_id: userId } });
        await tx.notifications.deleteMany({ where: { user_id: userId } });
        await tx.bookmark.deleteMany({ where: { user_id: userId } });
        await tx.savedList.deleteMany({ where: { user_id: userId } });
        await tx.userAlertPrefs.deleteMany({ where: { user_id: userId } });
        await tx.saved_searches.deleteMany({ where: { user_id: userId } });
        await tx.content_reports.updateMany({
          where: { reporter_id: userId },
          data: { reporter_id: null },
        });
        await tx.user_blocks.deleteMany({
          where: {
            OR: [{ blocker_user_id: userId }, { blocked_user_id: userId }],
          },
        });
        await tx.campaign_follows.deleteMany({
          where: {
            OR: [
              { user_id: userId },
              ...(emailInsensitive ? [{ email: emailInsensitive }] : []),
            ],
          },
        });
        await tx.cause_shares.deleteMany({ where: { user_id: userId } });
        await tx.userStreak.deleteMany({ where: { userId } });
        await tx.userWallet.deleteMany({ where: { userId } });
        await tx.rewardTransaction.deleteMany({ where: { userId } });
        await tx.eiza_transactions.deleteMany({ where: { user_id: userId } });
        await tx.events.deleteMany({ where: { user_id: userId } });
        await tx.referral.deleteMany({
          where: { OR: [{ referrerId: userId }, { refereeId: userId }] },
        });
        await tx.referrals_v1.deleteMany({
          where: {
            OR: [{ referrer_id_v1: userId }, { referee_id_v1: userId }],
          },
        });

        if (userWebhooks.length > 0) {
          const webhookIds = userWebhooks.map((w) => w.id);
          await tx.api_webhook_logs.deleteMany({
            where: { webhook_id: { in: webhookIds } },
          });
        }
        await tx.api_webhooks.deleteMany({ where: { user_id: userId } });
        await tx.api_keys.deleteMany({ where: { user_id: userId } });
        await tx.api_bank_accounts.deleteMany({
          where: { developer_id: userId },
        });
        await tx.api_request_logs.updateMany({
          where: { user_id: userId },
          data: { user_id: null, ip_address: null },
        });
        if (deletableApiCampaignIds.length > 0) {
          await tx.api_campaigns.deleteMany({
            where: { id: { in: deletableApiCampaignIds } },
          });
        }
        if (historicalApiCampaignIds.length > 0) {
          await tx.api_campaigns.updateMany({
            where: { id: { in: historicalApiCampaignIds } },
            data: {
              bank_account_number: "DELETED",
              bank_account_name: anonymizedName,
              sub_account_code: null,
            },
          });
        }

        if (emailInsensitive) {
          await Promise.all([
            tx.pendingRegistration.deleteMany({
              where: { email: emailInsensitive },
            }),
            tx.passwordResetToken.deleteMany({
              where: { email: emailInsensitive },
            }),
            tx.verificationToken.deleteMany({
              where: {
                OR: [
                  { identifier: { startsWith: `email-change:${userId}:` } },
                  { identifier: emailInsensitive },
                ],
              },
            }),
            tx.signatures.updateMany({
              where: { user_id: null, email: emailInsensitive },
              data: {
                name: anonymizedName,
                email: anonymizedEmail,
                message: null,
                is_anonymous: true,
              },
            }),
          ]);
        } else {
          await tx.verificationToken.deleteMany({
            where: { identifier: { startsWith: `email-change:${userId}:` } },
          });
        }

        await tx.organizationInvitation.deleteMany({
          where: {
            OR: [
              { invitedById: userId },
              ...(emailInsensitive ? [{ email: emailInsensitive }] : []),
            ],
          },
        });
        await tx.organizationMember.deleteMany({ where: { userId } });
        await tx.organization.deleteMany({ where: { ownerId: userId } });

        // 3c. Delete comments & petition signatures authored by the user
        await tx.comments.deleteMany({ where: { user_id: userId } });
        await tx.petition_comments.deleteMany({ where: { user_id: userId } });
        await tx.signatures.deleteMany({ where: { user_id: userId } });

        // 3d. Delete cause/petition edit drafts created by the user
        const userCauseEdits = await tx.cause_edits.findMany({
          where: {
            OR: [
              { user_id: userId },
              ...(deletableCauseIds.length > 0
                ? [{ original_cause_id: { in: deletableCauseIds } }]
                : []),
            ],
          },
          select: { id: true },
        });
        if (userCauseEdits.length > 0) {
          const editIds = userCauseEdits.map((e) => e.id);
          await tx.cause_edit_sections.deleteMany({
            where: { cause_edit_id: { in: editIds } },
          });
          await tx.cause_edits.deleteMany({
            where: { id: { in: editIds } },
          });
        }

        const userPetitionEdits = await tx.petition_edits.findMany({
          where: {
            OR: [
              { user_id: userId },
              ...(petitionIds.length > 0
                ? [{ original_petition_id: { in: petitionIds } }]
                : []),
            ],
          },
          select: { id: true },
        });
        if (userPetitionEdits.length > 0) {
          const petitionEditIds = userPetitionEdits.map((e) => e.id);
          await tx.petition_edit_sections.deleteMany({
            where: { petition_edit_id: { in: petitionEditIds } },
          });
          await tx.petition_edits.deleteMany({
            where: { id: { in: petitionEditIds } },
          });
        }

        // 3e. Delete user's petitions and their child records
        if (petitionIds.length > 0) {
          await tx.petition_comments.deleteMany({
            where: { petition_id: { in: petitionIds } },
          });
          await tx.petition_sections.deleteMany({
            where: { petition_id: { in: petitionIds } },
          });
          await tx.signatures.deleteMany({
            where: { petition_id: { in: petitionIds } },
          });
          await tx.petitions.deleteMany({
            where: { id: { in: petitionIds } },
          });
        }

        // 3f. Delete unfunded causes and their child records
        if (deletableCauseIds.length > 0) {
          await tx.comments.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.cause_sections.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.campaign_follows.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.cause_shares.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.bookmark.deleteMany({
            where: {
              target_type: "cause",
              target_id: { in: deletableCauseIds },
            },
          });
          await tx.campaign_proof_updates.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.campaign_proof_requirements.deleteMany({
            where: { cause_id: { in: deletableCauseIds } },
          });
          await tx.cause.deleteMany({
            where: { id: { in: deletableCauseIds } },
          });
        }

        // 3g. Delete OAuth accounts, sessions, and roles
        await tx.session.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        await tx.role.deleteMany({ where: { user_id: userId } });

        // 3h. Tombstone if historical funded causes remain; hard-delete otherwise.
        if (historicalFundedCauseIds.length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              email: anonymizedEmail,
              emailVerified: null,
              fullName: anonymizedName,
              firstName: null,
              lastName: null,
              displayName: null,
              username: null,
              phone: null,
              password: null,
              profilePhoto: null,
              bio: null,
              location: null,
              website: null,
              gender: null,
              accountNumber: null,
              accountName: null,
              bankName: null,
              subAccountCode: null,
              flutterwaveSubAccountId: null,
              solana_wallet: null,
              crypto_wallets: Prisma.DbNull,
              twitter_url: null,
              facebook_url: null,
              instagram_url: null,
              linkedin_url: null,
              referralCode: null,
              lastLoginUserAgent: null,
              interests: [],
              interest_location: null,
              failed_login_attempts: 0,
              locked_until: null,
              isVerified: false,
              isBlocked: true,
              sessions_invalidated_after: new Date(),
            },
          });
        } else {
          await tx.user.delete({
            where: { id: userId },
          });
        }

        return {
          ok: true,
          diditSessionIds,
          extraS3Keys,
        };
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    if (!outcome.ok) {
      return outcome.result;
    }

    // 4. Commit succeeded: purge external KYC sessions and personal S3 files (best-effort)
    await Promise.allSettled([
      deleteDiditSessions(outcome.diditSessionIds),
      deleteUserPersonalS3Files(userId, outcome.extraS3Keys),
    ]);

    return {
      success: true,
      statusCode: 200,
    };
  } catch (error) {
    console.error("Failed to execute user account deletion:", error);
    return {
      success: false,
      statusCode: 500,
      error: "Failed to delete account. Please try again or contact support.",
      code: "DELETION_FAILED",
    };
  }
}
