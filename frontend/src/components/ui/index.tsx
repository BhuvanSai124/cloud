import React from "react";
import { NoDataState } from "./NoDataState";

export * from "./ChartCard";
export * from "./KPICard";
export * from "./LoadingSkeleton";
export * from "./ErrorState";
export * from "./NoDataState";
export * from "./common";

export const noDataState = NoDataState;

export const MetricSparkline = ({ data = [], color = "#00d4ff" }: { data?: number[]; color?: string }) => {
  return (
    <div className="h-8 flex items-end gap-1">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-t transition-all"
          style={{ height: `${Math.max(10, Math.min(100, v))}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export const SuccessState = ({ message = "Operation completed successfully" }: { message?: string }) => {
  return (
    <div className="bg-emerald-950/40 border border-emerald-600/30 rounded p-4 text-emerald-400">
      {message}
    </div>
  );
};
