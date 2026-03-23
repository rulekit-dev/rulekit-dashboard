"use client";

import React, { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

export default function Skeleton({ width, height = "16px", style }: SkeletonProps) {
  const skeletonStyle: CSSProperties = {
    width: width,
    height: height,
    borderRadius: "4px",
    ...style,
  };

  return <div className="skeleton" style={skeletonStyle} />;
}
