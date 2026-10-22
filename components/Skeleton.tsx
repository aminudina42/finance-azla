import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export default function Skeleton({
  className = "",
  width,
  height,
  borderRadius = "8px",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "16px",
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
