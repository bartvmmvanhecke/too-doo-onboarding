import type { ReactNode } from "react";
import { Check, CircleMinus } from "lucide-react";

/** Lijst met vinkjes (of streepjes) zoals in de rechterpanelen van stap 1. */
export function BenefitList({ items }: { items: { text: ReactNode; muted?: boolean }[] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          {item.muted ? (
            <CircleMinus className="size-[22px] shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
          ) : (
            <Check className="size-[22px] shrink-0 text-success" strokeWidth={2.5} aria-hidden />
          )}
          <span className={item.muted ? "text-base leading-[1.45] text-ink-2" : "text-base leading-[1.45]"}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
