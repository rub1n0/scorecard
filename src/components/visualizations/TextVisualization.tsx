"use client";

import React from "react";

type TextVisualizationProps = {
  value: string;
  style?: React.CSSProperties;
};

export default function TextVisualization({ value, style }: TextVisualizationProps) {
  const textLength = value.length;

  let fontSizeClass = "text-[10rem]";
  if (textLength > 24) fontSizeClass = "text-4xl";
  else if (textLength > 18) fontSizeClass = "text-5xl";
  else if (textLength > 14) fontSizeClass = "text-6xl";
  else if (textLength > 10) fontSizeClass = "text-7xl";
  else if (textLength > 7) fontSizeClass = "text-8xl";
  else if (textLength > 4) fontSizeClass = "text-[9rem]";

  return (
    <div className="flex flex-col justify-center h-full py-4">
      <div className="flex items-center justify-center w-full">
        <p
          className={`${fontSizeClass} font-bold text-industrial-100 font-mono tracking-tight text-center leading-none break-words max-w-full px-2`}
          style={style}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
