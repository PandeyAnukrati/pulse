import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = "glass", size = "md", isLoading, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50 select-none";

    const variants = {
      primary: "bg-[#FF5C00] text-white hover:bg-[#E55200] active:bg-[#CC4900]",
      secondary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800",
      glass:
        "bg-white/[0.02] border border-white/[0.05] text-white hover:bg-white/[0.06] hover:border-white/[0.1] active:bg-white/[0.04]",
      ghost: "text-white/80 hover:bg-white/[0.04] hover:text-white active:bg-white/[0.02]",
      danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:bg-red-500/15",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...(props as any)}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
