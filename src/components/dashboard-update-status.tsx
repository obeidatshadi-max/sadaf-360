"use client";

import { useEffect, useState } from "react";
import status from "@/lib/dashboard-status.json";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: status.timeZone,
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function DashboardUpdateStatus({ sampleAsOf, integration }: { sampleAsOf?: string; integration?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const frame = window.requestAnimationFrame(tick);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section aria-label="Date, time and data freshness" className="flex flex-col gap-x-6 gap-y-2 border-b border-line bg-brand-soft px-4 py-3 text-xs text-ink md:flex-row md:flex-wrap md:px-8">
      <div>
        <span className="font-semibold">Current day &amp; time: </span>
        <time data-current-time dateTime={now?.toISOString()}>{now ? dateTime.format(now) : "Loading clock…"}</time>
        <span> · Jordan time</span>
      </div>
      <div>
        <span className="font-semibold">Screen updated: </span>
        <time dateTime={status.screenUpdatedAt}>{dateTime.format(new Date(status.screenUpdatedAt))}</time>
        <span> · Jordan time</span>
      </div>
      <div>
        <span className="font-semibold">Data last integrated: </span>
        <span>{integration ?? "Not connected — no imports completed"}</span>
        {sampleAsOf ? <span> · Sample data as of {sampleAsOf}</span> : null}
      </div>
    </section>
  );
}
