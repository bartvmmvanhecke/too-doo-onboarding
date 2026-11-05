"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { meetingKpi } from "@/lib/meeting-kpi";
const hours = (n:number) => `${n.toLocaleString("nl-BE",{maximumFractionDigits:1})} uur`;
export function MeetingKpi() {
  const meetings = useStore(s=>s.meetings);
  const kpi = meetingKpi(meetings);
  return <div className="space-y-6"><Link href="/app" className="text-sm text-brand">← Vergaderingen</Link><h1 className="text-3xl font-bold">Vergaderingen</h1>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{title:"Totaal vergaderingen",value:String(kpi.total)},{title:"Gepland",value:hours(kpi.scheduled)},{title:"Werkelijk",value:hours(kpi.actual)},{title:"Niet afgerond",value:`${kpi.automatic} van ${kpi.total}`,sub:"automatisch afgesloten"}].map(tile=><section key={tile.title} className={`rounded-2xl border border-line p-5 ${tile.sub ? "bg-[var(--wrap-amber-bg)]" : "bg-white"}`}><h2 className="text-sm text-ink-2">{tile.title}</h2><p className="my-2 text-3xl font-bold">{tile.value}</p>{tile.sub && <p className="text-sm text-[var(--wrap-amber-ink)]">{tile.sub}</p>}</section>)}
    </div>
    <div className="max-w-full overflow-x-auto rounded-2xl border border-line bg-white" tabIndex={0} role="region" aria-label="Vergaderingen per type">
      <table className="w-full min-w-[680px] text-left text-sm"><caption className="p-4 text-left font-bold">Afgesloten vergaderingen per type</caption><thead><tr>{["Type","Vergaderingen","Gepland","Werkelijk","Afgesloten"].map(h=><th key={h} scope="col" className="border-y border-line p-4">{h}</th>)}</tr></thead><tbody>{kpi.rows.map(row=><tr key={row.type}><th scope="row" className="p-4">{row.type || "Algemeen"}</th><td className="p-4">{row.count}</td><td className="p-4">{hours(row.scheduled)}</td><td className="p-4">{hours(row.actual)}{row.outliers > 0 && <span className="mt-1 block text-xs text-[var(--wrap-amber-ink)]">{row.outliers} uitschieter(s) uitgesloten</span>}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.manual ? "bg-[var(--wrap-success-bg)] text-[var(--wrap-success-ink)]" : "bg-line-soft text-ink-2"}`}>{row.manual ? "afgerond" : "automatisch"}</span>{!row.manual && <span className="mt-2 block text-xs text-ink-3">stond {hours(row.raw)} open</span>}</td></tr>)}</tbody></table>
      {!kpi.rows.length && <p className="p-4 text-sm text-ink-3">Nog geen afgesloten vergaderingen.</p>}
    </div>
    <p className="text-sm text-ink-3">Werkelijke duur = afsluiten of laatste activiteit + buffer, wat het eerst komt.</p>
  </div>;
}
