# Refreeg: instructions for AI coding agents

Applies to any agent (Antigravity, subagents, Claude Code, Cursor, Codex, Copilot, Gemini, others) working on `refreeg-v2`.

1. **Code structure & style:** Always follow [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx) and activate the `refreeg-code-standards` skill ([.agents/skills/refreeg-code-standards/SKILL.md](.agents/skills/refreeg-code-standards/SKILL.md)) before writing or reviewing code.
2. **Visual design:** Follow [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md) (colors, typography, shared UI components in `components/ui/`).
3. **Reviewing changes:** When asked to review, rate, or fix changes "against the standard", run the review procedure in [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx) / `refreeg-code-standards`.
4. **Before finishing:** Run `pnpm lint` and `pnpm tsc --noEmit`.

## Where code lives (`refreeg-v2`)

| Layer | Location | Job |
| --- | --- | --- |
| Server actions | `actions/<feature>-actions.ts` | Auth check, input check, one Prisma or provider call, return `{ success, error }` or data. Nothing else. |
| Provider clients | `services/`, `lib/` | Talk to Paystack, Flutterwave, Breet, mail. No UI knowledge. |
| Hooks | `hooks/use-<feature>.ts` | React Query wiring and any post-processing of a result. |
| Schemas | `lib/schemas/<feature>.schema.ts` | One zod schema per form. |
| Options | `lib/options/<feature>.options.ts` | Label and value lists (`xxxOptions`). |
| Components | `components/<feature>/` | Thin. Render, call hooks, hold local UI state. |

## Core Rules (from `docs/CODE_STANDARDS.mdx`)

Follow these for all new code and any file you substantially change (do not mass-rewrite untouched legacy files):

1. **Actions only do the work, nothing around it:** Authenticate, validate, run one operation, and return `{ success, error }` or data. No formatting for display, toasting, or UI side effects inside actions; post-processing goes in `hooks/use-<feature>.ts`.
2. **No intermediary layers:** Use plain calls, backend pagination, and API filters. No fetch-all-pages wrappers, needless field-renaming mappers, or single-use helpers.
3. **Show the real error, no error maps:** Surface `result.error` or `query.error?.message` directly. No `*_ERRORS` maps, error translators, or generic fallback strings at call sites — fix poor messages in the action.
4. **One state object per form:** Forms/dialogs with related fields share one `useState` object and one `setFormFields(key, value)` updater (no per-field `useState`). Non-form flags (tabs, open, loading) stay separate. Shared forms reuse a hook (e.g., `hooks/use-pledge-form.ts`).
5. **Validate with a zod schema:** Store each form schema in `lib/schemas/<feature>.schema.ts` and validate via `useValidator({ store: form, schema })` (`hooks/use-validator.ts`), displaying `errors.<field>` with `FieldError`. Do not duplicate server-owned limits (fee caps, provider minimums, rate limits). Submit order: validate -> double-submit guard -> call action. Keep `zodResolver` on existing React Hook Form forms.
6. **One dialog per file:** Each dialog gets its own file named for its job (`create-pledge-dialog.tsx`), exported by name. Page/section files only import dialogs and control open state. Use `ConfirmationModal` for plain confirms/deletes.
7. **Option lists go in options files:** Put `{ label, value }` lists in `lib/options/<feature>.options.ts` as `xxxOptions` with `as const satisfies readonly Option[]` (never `UPPER_CASE`, never inline in components/constants). Components take `readonly` option arrays.
8. **Say it once:** If an expression, lookup, or branch appears twice in a file, extract a variable or small same-file helper.
9. **Use what exists:** Check `components/ui/` and shared components first (`EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`, `ConfirmationModal`). Never hardcode colors/fonts — use design tokens from `docs/DESIGN_GUIDE.md`. Do not duplicate empty states outside the list component.
10. **Small and flat:** One component per file (~200 lines max), early returns over deep nesting, no dead code or commented-out blocks, plain descriptive names, and comments that explain *why*, not *what*.

## 🍯 Honey (I Shrunk the AI) — token economy

Volume is cost. Say the fewest words that stay clear — in every response, even
when the user doesn't ask for brevity. Apply reflexively; never spend reasoning
on how to comply.

## Depth — match the question

- **Explain / how / why / should I** → keep the explanation; it _is_ the answer.
- **Do / write / fix / make** (or unsure) → terse; fragments over paragraphs.
- **Just / quick / one-liner** → answer only, plus one line for the main caveat.

Step **up**, never down, when brevity would cost correctness — a subtle risk, a
tradeoff, a learner who needs the why. An answer that forces a follow-up
question saved nothing.

## Cut

- Wind-up and wind-down: no "Great question!", no "hope this helps!", no
  restating the prompt, no announcing what you're about to do.
- Hedging: "use X", not "you might consider perhaps X". State real uncertainty
  once, briefly.
- Padding structure: no headers/sections for a one-fact answer; lists only when
  they're faster to read than prose.

## Never cut

- Names, numbers, dates, commands, steps, quotes — exact, complete.
- Anything the user will copy, paste, or act on.
- Warnings, risks, and safety-relevant caveats — health, money, legal,
  irreversible actions stay explicit.
- Anything the user explicitly asked for.

If compression makes the reader work to recover the meaning, stop — that moves
cost, it doesn't remove it.

## If asked for code

Minimum that solves it: standard library and language idioms before custom
helpers; no speculative options or "might need later" branches. Code blocks
verbatim and runnable — never `...`-elided. Keep input validation and error
handling that prevents data loss; one line on the main edge case.

Pin intensity by adding one line here: "Default to honey ultra" (max savings)
or "Default to honey lite" (keep explanations).

Full skill (all levers, ESON agent handoffs, satellites): [.agents/skills/honey/SKILL.md](.agents/skills/honey/SKILL.md)
