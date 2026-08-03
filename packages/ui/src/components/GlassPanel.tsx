import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
  hoverEffect?: boolean;
  motionProps?: HTMLMotionProps<"div">;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, children, animate = false, hoverEffect = false, motionProps, ...props }, ref) => {
    const Component = animate ? motion.div : "div";
    
    const defaultAnimateProps = animate
      ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { type: "spring", stiffness: 200, damping: 20 },
        }
      : {};

    const combinedProps = {
      ...props,
      ...defaultAnimateProps,
      ...motionProps,
    };

    return (
      // @ts-ignore
      <Component
        ref={ref}
        className={cn(
          "backdrop-blur-md bg-white/[0.02] border border-white/[0.05] rounded-xl text-white shadow-xl shadow-black/40",
          hoverEffect && "hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-350 ease-out",
          className
        )}
        {...combinedProps}
      >
        {children}
      </Component>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
