/* src/pages/SLOPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/common";

export default function SLOPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  const [slo, setSLO] = useState({
    target: "99.9",
    observed: null,
    remaining_budget: null,
    measurement_window: "30d",
    error_budget_percentage: null,
    is_within_budget: null,
    sample_size: "insufficient",
    explanation: "",
  });

  // Fetch SLO data - only available when uptime check data supports it
  useEffect(() => {
    // In simulated mode, explain that SLO requires uptime check data
    // In GCP mode, this would query actual uptime check results
    if (dataSource === "simulated") {
      setSLO({
        target: "99.9",
        observed: null,
        remaining_budget: null,
        measurement_window: "30d",
        error_budget_percentage: null,
        is_within_budget: null,
        sample_size: "unavailable - SLO requires uptime check data",
        explanation:
          "SLO/Availability panel only displays when valid uptime-check data\nand correct calculation are available. Currently in simulated mode,\nno uptime checks are configured. Enable GCP mode with uptime checks\nto see SLO metrics.",
      });
    } else {
      // GCP mode - would fetch real uptime check data
      // For now, show placeholder
      setSLO({
        target: "99.9",
        observed: null,
        remaining_budget: null,
        measurement_window: "30d",
        error_budget_percentage: null,
        is_within_budget: null,
        sample_size: "unavailable - awaiting GCP uptime check configuration",
        explanation:
          "Configure GCP uptime checks to enable SLO availability measurement.\nSee Settings & Integrations for uptime check setup.",
      });
    }
  }, [dataSource]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        SLO / Availability Panel
      </h2>

      <p className="text-gray-400 mb-6">
        Shows measured availability, target SLO, and remaining error budget.
        Only displays when valid uptime-check data supports it.
      </p>

      {/* SLO card */}
      <div className="bg-charcoal rounded p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Availability SLO
        </h3>

        {slo.sample_size && slo.sample_size.includes("unavailable")
          ? (
            <div className="p-3 text-red-400">
              <svg
                className="inline-block mr-2 text-red-400 w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 19l-5-5 1.41-1.41L13 16.17l7.71-7.71L23 8l-5.71 5.71L12 23Z"
                />
              </svg>
              {slo.explanation}
            </div>
          )
          : null}

        {/* SLO display when data is available */}
        {!slo.sample_size || !slo.sample_size.includes("unavailable") && slo.observed !== null && (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-400">
                {slo.observed?.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-400">Observed availability</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">
                {slo.remaining_budget?.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-400">Remaining error budget</p>
            </div>
          </div>
        )}

        {/* Target and status */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-lg font-bold text-cyan">Target: {slo.target}%</p>
              <p className="text-xs text-gray-400">Availability target</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {slo.measurement_window}
              </p>
              <p className="text-xs text-gray-400">Measurement window</p>
            </div>
            <div>
              <p className={`text-lg font-bold text-${slo.is_within_budget === true ? "green" : "red"}`}>
                {slo.is_within_budget === true ? "Within budget" : "Exceeding budget"}
              </p>
              <p className="text-xs text-gray-400">Budget status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation when no data */}
      {slo.sample_size && slo.sample_size.includes("unavailable") && (
        <div className="p-4 text-gray-300 text-sm">
          <p>{slo.explanation}</p>
        </div>
      )}
    </div>
  );
}