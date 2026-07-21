/**
 * React Bits 风格的卡片入场动画：淡入 + 轻微上移
 * 用于卡片列表的 stagger 渲染
 */
import { motion, useReducedMotion } from "framer-motion";

export function AnimatedCard({ children, delay = 0, className, ...props }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * 列表入场动画容器（带 stagger）
 */
export function AnimatedList({ children, className }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};
