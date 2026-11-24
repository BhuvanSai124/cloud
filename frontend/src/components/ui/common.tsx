import React from "react";

export const Button = ({
  children,
  className = "",
  variant = "default",
  disabled,
  onClick,
  type = "button",
  ...props
}: any) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all focus:outline-none disabled:opacity-50 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Table = ({ children, className = "", ...props }: any) => (
  <div className="w-full overflow-x-auto">
    <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHead = ({ children, className = "", ...props }: any) => (
  <thead className={`border-b border-gray-700 bg-gray-900/60 text-xs text-gray-400 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = "", ...props }: any) => (
  <tbody className={`divide-y divide-gray-800 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = "", ...props }: any) => (
  <tr className={`hover:bg-gray-800/40 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", ...props }: any) => (
  <td className={`p-3 align-middle ${className}`} {...props}>
    {children}
  </td>
);

export const Form = ({ children, className = "", onSubmit, ...props }: any) => (
  <form onSubmit={onSubmit} className={`space-y-4 ${className}`} {...props}>
    {children}
  </form>
);

export const Input = ({ className = "", ...props }: any) => (
  <input
    className={`bg-navy border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan ${className}`}
    {...props}
  />
);
