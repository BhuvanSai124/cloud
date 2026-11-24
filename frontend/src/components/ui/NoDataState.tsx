/* src/components/ui/NoDataState.tsx */
import React from "react";

export function NoDataState() {
  return (
    <div className="bg-charcoal rounded p-8 text-center">
      <svg
        className="mx-auto mb-4 text-gray-500 w-12 h-12"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <line
          x1="15"
          y1="9"
          x2="9"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="9"
          y1="9"
          x2="15"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-300 mb-2">No data available</h3>
      <p className="text-gray-400">
        Metrics will appear here once collection begins. Check the data source
        status and ensure applications are configured.
      </p>
    </div>
  );
}