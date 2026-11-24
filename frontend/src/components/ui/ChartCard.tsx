/* src/components/ui/ChartCard.tsx */
import React from "react";

interface ChartCardProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
  name: string;
  color: string;
}

export function ChartCard({
  title,
  data,
  xKey,
  yKey,
  name,
  color,
}: ChartCardProps) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-400">No data available</div>;
  }

  return (
    <div className="bg-charcoal rounded p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>
      <div className="h-64">
        {/* Placeholder for Recharts - will be rendered by consumer */}
        <p className="text-gray-500 text-center align-middle h-full">
          Chart: {name}
        </p>
      </div>
    </div>
  );
}