/**
 * React Bits 风格的 3D 倾斜卡片：跟随鼠标的轻微 3D 视差
 * 用于展开卡片的标题区
 */
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn.js";

export function TiltedCard({ children, className, maxTilt = 6 }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width - 0.5) * 2;
    const py = (y / rect.height - 0.5) * 2;
    setTransform(
      `perspective(800px) rotateX(${-py * maxTilt}deg) rotateY(${px * maxTilt}deg)`
    );
  };

  const reset = () => setTransform("");

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{ transform, transformStyle: "preserve-3d" }}
      className={cn("transition-transform duration-200 ease-out", className)}
    >
      {children}
    </motion.div>
  );
}
