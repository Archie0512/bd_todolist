/**
 * React Bits 风格的 shimmer 按钮：带渐变流光效果的按钮
 * 基于 framer-motion，遵守 prefers-reduced-motion
 * 用法：<ShimmerButton onClick={...} className="...">登录</ShimmerButton>
 */
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn.js";

export function ShimmerButton({ children, className, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-md px-4 py-2 text-sm font-medium text-white",
        "bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "before:absolute before:inset-0 before:-translate-x-full",
        !reduceMotion &&
          "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-shimmer",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
