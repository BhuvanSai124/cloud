/* src/components/ui/KPICard.tsx */
import React from "react";

interface KPICardProps {
  title: string;
  count: number | string;
  subtitle: string;
  status?: "healthy" | "amber" | "red" | "gray";
}

export function KPICard({ title, count, subtitle, status = "gray" }: KPICardProps) {
  const statusClass = {
    healthy: "text-green-400",
    amber: "text-amber-400",
    red: "text-red-400",
    gray: "text-gray-400",
  }[status];

  return (
    <div className="bg-charcoal rounded p-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${statusClass}`}>
            {count}
          </p>
        </div>
        <div className={`w-6 h-6 rounded-full ${statusClass}`} />
      </div>
      <p className="text-xs mt-2 text-gray-500">{subtitle}</p>
    </div>
  );
}