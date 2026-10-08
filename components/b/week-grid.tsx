import type { Series } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const DAYS = [
  { label: "ma", weekday: 1 },
  { label: "di", weekday: 2 },
  { label: "wo", weekday: 3 },
  { label: "do", weekday: 4 },
  { label: "vr", weekday: 5 },
];

function inWeek(s: Series, week: 1 | 2): boolean {
  // Weekelijks staat in beide weken; om de 2 weken en maandelijks enkel in week 1.
  return s.rule.kind === "weekly" || week === 1;
}

/** "Jouw overlegritme": twee weken, ma–vr; opgevolgde reeksen in de primaire kleur. */
export function WeekGrid({ series, selected }: { series: Series[]; selected: string[] }) {
  const sorted = [...series].sort((a, b) => a.time - b.time);
  return (
    <table className="w-full table-fixed border-separate border-spacing-1.5 text-xs">
      <caption className="sr-only">Je vaste overleggen per weekdag, over twee weken</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[60px]">
            <span className="sr-only">Week</span>
          </th>
          {DAYS.map((d) => (
            <th key={d.label} scope="col" className="text-left font-extrabold text-ink-3">
              {d.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {([1, 2] as const).map((week) => (
          <tr key={week}>
            <th scope="row" className="text-left font-bold text-ink-3">
              Week {week}
            </th>
            {DAYS.map((d) => (
              <td key={d.label} className="align-top">
                <ul className="flex flex-col gap-[3px]">
                  {sorted
                    .filter((s) => s.rule.weekday === d.weekday && inWeek(s, week))
                    .map((s) => {
                      const on = selected.includes(s.id);
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            "rounded px-[5px] py-[3px] font-bold [overflow-wrap:anywhere]",
                            on ? "bg-brand text-white" : "bg-track text-ink",
                          )}
                        >
                          {s.short}
                          {on && <span className="sr-only"> (opgevolgd)</span>}
                        </li>
                      );
                    })}
                </ul>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
