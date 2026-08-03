import * as React from "react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-white/30 backdrop-blur-md transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-white/[0.15] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/40 focus-visible:ring-red-500/30",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
