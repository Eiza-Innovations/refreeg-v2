import { Eyebrow } from "@/components/ui/eyebrow";

/** A hairline rule with a centred label, between social and email sign-in. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative my-7 text-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-warm-neutral" />
      </div>
      <Eyebrow className="relative bg-surface px-3 text-[10px]">
        {label}
      </Eyebrow>
    </div>
  );
}
