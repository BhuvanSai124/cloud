/* src/components/ui/LoadingSkeleton.tsx */
import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  height?: number | string;
}

export function LoadingSkeleton({ lines = 8, height = "auto" }: LoadingSkeletonProps) {
  return (
    <div className="bg-charcoal rounded p-4">
      <div className="h-[20px] rounded my-1 bg-gray-800" />
      {lines > 1 && (
        <div>
          {Array.from({ length: lines - 1 }, () => (
            <div key={Math.random()}
                 className="h-[20px] rounded my-1 bg-gray-800 w-full max-w-xs" />
          ))}
        </div>
      )}
    </div>
  );
}