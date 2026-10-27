import React from "react";

interface SkeletonProps {
  as?: "div" | "span";
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export default function Skeleton({
  as,
  className = "",
  width,
  height,
  borderRadius = "8px",
  style,
}: SkeletonProps) {
  const isInline =
    as === "span" ||
    style?.display === "inline-block" ||
    style?.display === "inline" ||
    style?.display === "inline-flex";

  const Tag = as || (isInline ? "span" : "div");

  return (
    <Tag
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "16px",
        borderRadius,
        display: isInline ? "inline-block" : "block",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
