import type { ProfileStat } from "@/components/profile/profile-types";

interface ProfileStatsProps {
  stats: ProfileStat[];
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <div className="mt-6 grid grid-cols-4 divide-x divide-hairline rounded-2xl border border-hairline bg-surface py-4 shadow-none">
      {stats.map((stat) => (
        <div key={stat.label} className="px-2 text-center">
          <p className="font-fraunces text-lg font-medium tracking-tight text-ink sm:text-2xl">
            {stat.value}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/55 sm:text-xs">
            {stat.label}
          </p>
          {stat.sub && (
            <p className="mt-0.5 text-[11px] text-ink/45">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
