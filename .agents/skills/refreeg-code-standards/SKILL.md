---
name: refreeg-code-standards
description: Refreeg code standard for writing and reviewing code on the RefreeG web app (refreeg-v2). Use whenever writing, editing, or reviewing components, hooks, server actions, forms, schemas, options, or dialogs, or when asked to review, rate, or fix changes against the standard.
---

Tool-agnostic: works for any AI coding agent (Antigravity, subagents, Claude Code, Cursor, Codex, Copilot) or human reviewer. Source of truth: `docs/CODE_STANDARDS.mdx` in `refreeg-v2`. Visual rules: `docs/DESIGN_GUIDE.md`. Read the mdx when a rule is unclear.

## Where code lives

| Layer            | Location                                | Job                                                                                                      |
| ---------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Server actions   | `actions/<domain>/<feature>-actions.ts` | Auth check, input check, one Prisma or provider call, return `{ success, error }` or data. Nothing else. |
| Provider clients | `services/`, `lib/`                     | Talk to Paystack, Flutterwave, Breet, mail. No UI knowledge.                                             |
| Hooks            | `hooks/use-<feature>.ts`                | React Query wiring and any post-processing of a result.                                                  |
| Schemas          | `lib/schemas/<feature>.schema.ts`       | One zod schema per form.                                                                                 |
| Options          | `lib/options/<feature>.options.ts`      | Label and value lists (`xxxOptions`).                                                                    |
| Types            | `types/<feature>-types.ts`              | Shared types and interfaces. Never declared or exported from `actions/`.                                 |
| Components       | `components/<domain>/<Component>.tsx`   | Thin. Render, call hooks, hold local UI state.                                                           |

## Checklist (16 Rules)

1. **Actions do only the work.** `actions/*` authenticate, validate, run one operation, and return `{ success, error }` or data. They do not format for display, toast, or trigger UI side effects. Parsing, view shaping, and side effects go in `hooks/use-<feature>.ts`.
2. **No intermediary layers.** Plain calls, backend pagination, and API filters. No fetch-all-pages wrappers, no single-use helpers, no needless mappers renaming fields.
3. **Real errors only.** Show `result.error` or `query.error?.message` directly. No error helper, no `*_ERRORS` maps, no per-status wording or generic fallback strings at call sites. Fix unclear messages in the action.
4. **One state object per form.** Forms and dialogs with related fields use one `useState` object plus a `setFormFields(key, value)` updater (no per-field `useState`). When one change sets two fields, call `setForm` directly in that handler. Non-form flags (`tab`, `open`, `loading`) stay separate. Forms sharing fields and submit flow share one hook (e.g. `hooks/use-pledge-form.ts`).
5. **Zod for forms.** One schema in `lib/schemas/<feature>.schema.ts`, checked with `useValidator({ store: form, schema })` (`hooks/use-validator.ts`); show `errors.<field>` under inputs (`FieldError`). Submit order: validate -> double-submit guard -> call action. Do not duplicate limits the server owns (fee caps, provider minimums, rate limits). Existing React Hook Form forms keep `zodResolver` — never mix both.
6. **One dialog per file.** Each dialog (`create`, `edit`, `delete`, `confirm`) gets its own file named for its job, exported by name. Section/page files only import and control open state. Use `AlertDialog` (`components/ui/alert-dialog.tsx`) or `Dialog` before writing a custom confirm/delete modal.
7. **Options files.** Put `{ label, value }` lists in `lib/options/<feature>.options.ts` as `xxxOptions` with `as const satisfies readonly Option[]` (not `UPPER_CASE`, never inline in components/constants). Components accept `readonly` option arrays.
8. **Say it once.** Repeated expression, lookup, or type-based branch in a file becomes a variable or small same-file helper/hook. Scan every written file for repeats before finishing.
   8b. **Search before you write; extract when repeated.** Before adding a function, component, hook, schema, or Prisma query, grep the repo for one that exists and use it. Same logic in 2+ files becomes one shared function (`lib/`), component, hook, or action/loader; update every copy in the same change. Examples: `goalPercent`, `lib/duration.ts`, `usePetitionSignForm`, `SignFormFields`.
9. **Use what exists.** Check `components/ui/` before raw HTML. Reuse `EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`, `AlertDialog`. Use typography components from `@/components/marketing/Typography` (`Heading`, `P`, `Lead`, `Small`, `Strong`, `Span`) rather than raw heading/paragraph HTML elements. Vary the empty message on the single list component — no extra empty-state ternary. Use `DESIGN_GUIDE.md` tokens, never hardcoded colors or fonts.
10. **Small and flat.** One component per file (~200 lines max), early returns over nesting, no dead code/commented-out blocks/unused exports, plain names, and comments that explain _why_ only.
11. **Tables use the shared DataTable.** `components/ui/data-table.tsx` + `data-table-features.ts` + a `columns.tsx` per table; never raw `<Table>` markup inside a page or card.
12. **Submits run through useMutation.** `useMutation` wraps the action call, `useValidator` runs first, `isPending` guards double submit, and on response show `result.error` via `FieldError` and return early, or close and navigate on success.
13. **Types live in `types/`.** Every named `type`/`interface` (props, hook options, variants, action results) goes in `types/<feature>-types.ts`; only `z.infer` types stay beside their schema and tiny inline one-parameter annotations stay inline. `actions/*` export async functions only. Result shapes, row types and input types go in `types/<feature>-types.ts` and are imported with `import type` by the action, hook and component.
14. **Shell inheritance and WorkspaceFrame.** Never inject arbitrary background gradient/overlay wrappers (`ClientLayoutWrapper`). Every `/dashboard/admin/*` screen inherits `AdminShell` (`bg-cream`) and page padding from `<WorkspaceFrame>` (`components/admin/workspace/workspace-frame.tsx`, `px-4 py-8 sm:px-8 max-w-[1440px]`). Never add redundant server-side role checks (`if (role !== "admin")`) inside `/dashboard/admin/*` page components — `middleware.ts` already guards all `/dashboard/admin/*` routes globally. Access recently migrated or optional Prisma models defensively (e.g. `(prisma as any).<model>?.aggregate`) with fallback defaults so schema evolution never crashes screens.
15. **Prisma best practice.** Typed client first, `$queryRaw` only when needed. `select` needed columns; no query in a loop. Guarded writes atomic (`$transaction`, conditional `updateMany` + `count`). Catch `P2002`/`P2025`; log Prisma errors, return stable messages. `@relation` + `onDelete`, enums/CHECK, `Timestamptz`/`Decimal`, index every filter/sort/join. One generated migration per change; no `IF NOT EXISTS` drift hiding, no edited applied migrations, no duplicate table migrations; every used model exists in `prisma/schema/`.
16. **SQL best practice.** `Prisma.sql` params only, `Prisma.raw` literal identifiers only, no spliced constants (`make_interval`), cast ambiguous params. Bound every scan; no self-joins on large/unindexed columns, per-row correlated subqueries or unbounded windows. Dedupe fan-out joins before counting. No `SELECT *`; half-open `TIMESTAMPTZ` ranges; cache heavy reports with a tag; `EXPLAIN` new queries.
17. **Server actions are public endpoints.** Each action authenticates and authorizes itself, reads included. Never trust `userId`/`userAgent`/role arguments. No internal helpers exported from `"use server"` files. Anonymous writes go through a rate-limited, validated route handler.

## When writing

- Apply the checklist while writing, not after. For ported or stashed code, run the checklist on it before finishing.
- Do not mass-rewrite old files that predate these rules; apply the standard to new files and any file you substantially change.

## When reviewing or rating

1. List changed and untracked files (read-only git commands, never commit or push unless asked).
2. Check each file against rules 1 to 16 and `docs/DESIGN_GUIDE.md`. Specifically hunt raw HTML where a shared component exists, per-field `useState` in forms, inline options, hand-rolled `<Table>` markup, plain async dialog submits, error maps, `export type`/`interface` inside `actions/`, unauthenticated actions, raw SQL without bounds or indexes, and unsafe migrations.
3. Report each hit as `file:line`, rule number, and fix. End with a short verdict.
4. If asked to fix, fix every hit, then review again until clean. Run `pnpm lint` and `pnpm tsc --noEmit`.

## When corrected

If the user or a reviewer corrects a pattern, add it as a rule to `docs/CODE_STANDARDS.mdx` and mirror it in this `SKILL.md` and `AGENTS.md` so it is not repeated.
