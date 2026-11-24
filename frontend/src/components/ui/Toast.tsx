import React from "react";
import { useApp } from "@/context/AppContext";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = "border-cyan-500/40 bg-gray-900/95 text-cyan-200";
        let iconColor = "text-cyan-400";

        if (toast.type === "success") {
          Icon = CheckCircle2;
          borderClass = "border-emerald-500/40 bg-gray-900/95 text-emerald-200";
          iconColor = "text-emerald-400";
        } else if (toast.type === "error") {
          Icon = AlertCircle;
          borderClass = "border-rose-500/40 bg-gray-900/95 text-rose-200";
          iconColor = "text-rose-400";
        } else if (toast.type === "warning") {
          Icon = AlertTriangle;
          borderClass = "border-amber-500/40 bg-gray-900/95 text-amber-200";
          iconColor = "text-amber-400";
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${borderClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold tracking-tight">{toast.title}</div>
              {toast.message && (
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
