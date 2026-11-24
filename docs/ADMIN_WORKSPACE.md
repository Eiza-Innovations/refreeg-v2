# Admin analytics

`/dashboard/admin` (Overview) and `/dashboard/admin/analytics` (Analytics) render inside the
existing admin shell (`components/admin-shell`). Signed-out visitors are sent to sign-in; other
roles get a 404. The older operational reports (KYC/payment rates, lifecycle, alerts) live at
`/dashboard/admin/analytics/operations`.

## Files

- `app/dashboard/admin/analytics/page.tsx`: auth/role check, `?period=day|month|year`, loads data.
- `lib/admin-analytics/workspace-data.ts`: all Prisma queries, cached for 2 minutes
  (`unstable_cache`, tag `admin-analytics`).
- `lib/admin-analytics/period.ts`: reporting windows and chart buckets in Lagos time.
- `components/admin/analytics-workspace.tsx`: views, period switching, CSV export.
- `components/admin/workspace/`: analytics and detail views, charts, shared UI.
- `components/layout/ClientLayoutWrapper.tsx`: both routes use the cream page background.

## Where the numbers come from

| Panel                            | Source                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Donations, donors, average gift  | completed `donations` + `crypto_donations` (naira)                                                                   |
| Pledge → donation                | `pledges` created in the window that are `fulfilled`                                                                 |
| Campaign status                  | approved, unended `causes`; inactive = no gift for 21 days; paused = `paused` or `compliance_paused`                 |
| EIZA issued                      | `reward_transactions` grouped by `transaction_type`                                                                  |
| Who holds EIZA                   | `profiles.total_points`                                                                                              |
| Ambassadors                      | `donor_referral_attributions` (donations driven), `referrals_v1` (referrals, sign-up rate), `referral_bonus` rewards |
| Active users, retention, cohorts | `events` (logins, comments, shares, donations)                                                                       |

Windows: Day = today vs same time last week; Month = month to date vs the same span
of last month; Year = year to date vs the same span last year.

## Checks

```sh
pnpm exec jest --runInBand --coverage=false tests/components/analytics-workspace.test.tsx tests/lib/admin-workspace.test.ts tests/lib/admin-analytics-period.test.ts
```

Migration `20261111120000_admin_analytics_indexes` adds the date-range indexes these
queries rely on.

## Overview (`/dashboard/admin`)

`AdminOverview` reads `useAdminOverview` (`hooks/use-admin-overview.ts`, shapes the view) over
`getAdminOverview` (`actions/admin/admin-overview-actions.ts`, auth and queries). What counts as
"waiting" is shared with the sidebar badges in `lib/admin/review-queues.ts`. Roles are the real
ones, `admin` and `manager`:

- **admin**: Raised this month, Items in review, Open reports, Active campaigns, plus the donations chart.
- **manager**: queue-focused (Items in review, Longest wait, Open reports, Active campaigns), no money figures.

| Panel                           | Source                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Queues                          | pending `causes`, `kyc_verifications`, `campaign_proof_updates`, `petitions`, `content_reports` |
| Over SLA                        | `content_reports.due_at`, the only SLA in the schema; other queues show oldest-waiting age      |
| Waiting table                   | the six oldest pending items across all five queues                                             |
| Raised, chart, active campaigns | same queries as Analytics                                                                       |

Fund releases and withdrawals from the design are not shown: there is no data model for them yet.
