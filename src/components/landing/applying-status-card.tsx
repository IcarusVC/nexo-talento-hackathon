"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "queued" | "applying" | "applied";

const STATUS_LABEL: Record<Status, string> = {
  queued: "En cola",
  applying: "Postulando…",
  applied: "Postulado",
};

const STATUS_CLASS: Record<Status, string> = {
  queued: "bg-muted text-muted-foreground",
  applying: "bg-warning/15 text-warning",
  applied: "bg-success/15 text-success",
};

const JOBS = [
  { title: "Analista de Datos", company: "Stripe" },
  { title: "Socio Estratégico", company: "Microsoft" },
  { title: "Product Manager", company: "Tecnología" },
];

const SEQUENCE: Status[] = ["queued", "applying", "applied"];
const STEP_MS = 1400;

/**
 * Mirrors AIApply's looping "Applying now… → Applied" status card, but built
 * as real client-side state cycling rather than a baked animation/video asset.
 */
export function ApplyingStatusCard() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % (SEQUENCE.length * JOBS.length));
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const activeJobIndex = Math.floor(statusIndex / SEQUENCE.length) % JOBS.length;
  const activeJobStatus = SEQUENCE[statusIndex % SEQUENCE.length];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-left shadow-md">
      {JOBS.map((job, jobIndex) => {
        // Jobs the cycle has already passed sit at "applied"; jobs ahead of
        // it are still "queued"; the current job animates through the
        // sequence.
        const status: Status =
          jobIndex === activeJobIndex ? activeJobStatus : jobIndex < activeJobIndex ? "applied" : "queued";

        return (
          <div
            key={job.title}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl p-3",
              jobIndex > 0 && "mt-1 border-t border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint text-brand-violet">
                <Briefcase className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.company}</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors duration-300 ease-(--ease-smooth)",
                STATUS_CLASS[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
