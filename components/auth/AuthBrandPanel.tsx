import { Check } from "lucide-react";
import { AuthLogo } from "@/components/auth/AuthLogo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import type { AuthBrandPanelProps } from "@/types/auth-types";

const cardClass =
  "rounded-xl border border-white/10 bg-white/[0.06] p-4 xl:p-5";

/** The ink panel beside every auth form: promise, proof points and a quote. */
export function AuthBrandPanel({
  headline,
  subtitle,
  checklist,
  testimonial,
  bottomCard,
  className,
}: AuthBrandPanelProps) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col justify-between bg-ink p-10 text-white lg:flex lg:w-[40%] xl:p-14",
        className,
      )}
    >
      <AuthLogo variant="white" />

      <div className="my-auto max-w-md py-10">
        <h2 className="mb-4 font-fraunces text-3xl font-normal leading-[1.15] tracking-tight text-white xl:text-4xl">
          {headline}
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-white/65">{subtitle}</p>

        {checklist && checklist.length > 0 && (
          <ul className="space-y-5">
            {checklist.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[2.5] text-lime" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {testimonial && (
          <figure className={cn(cardClass, "flex items-center gap-3")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-lime-foreground">
              {testimonial.avatarInitials}
            </span>
            <div className="min-w-0">
              <blockquote className="text-xs leading-snug text-white/90">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-1 text-[11px] text-white/50">
                {testimonial.author}
              </figcaption>
            </div>
          </figure>
        )}

        {bottomCard && (
          <div className={cardClass}>
            {bottomCard.eyebrow && (
              <Eyebrow className="mb-1.5 block !text-white/45">
                {bottomCard.eyebrow}
              </Eyebrow>
            )}
            <p className="text-xs leading-relaxed text-white/80">
              {bottomCard.text}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
