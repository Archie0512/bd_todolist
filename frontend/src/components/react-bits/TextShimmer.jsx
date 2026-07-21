/**
 * React Bits 风格的 shimmer 文字：流光渐变文字效果
 * 用于空状态、占位文字
 */
import { cn } from "../../lib/cn.js";

export function TextShimmer({ children, className, as: Tag = "span" }) {
  return (
    <Tag
      className={cn(
        "inline-block bg-clip-text text-transparent",
        "bg-[linear-gradient(110deg,var(--color-background-4),45%,var(--color-foreground),55%,var(--color-background-4))]",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
    >
      {children}
    </Tag>
  );
}
