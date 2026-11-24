/* src/components/ui/ErrorState.tsx */
import React from "react";

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="bg-charcoal rounded p-4 border border-red-500/20">
      <p className="text-red-400 mb-2">
        <svg
          className="inline-block mr-2 text-red-400 w-5 h-5"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm.991 5.496-1.757 5.455L16.726 12l-5.243 1.805-1.757-5.455L7.522 12 2 17.768l1.757 5.455L12.707 23l5.243-1.805 1.757-5.455L20.478 12 12 6.232z"
          />
        </svg>
        Error loading data
      </p>
      <p className="text-gray-400 small">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 text-sm text-cyan hover underline"
      >
        Retry
      </button>
    </div>
  );
}