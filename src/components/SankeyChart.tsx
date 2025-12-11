"use client";

import React, { useEffect, useRef } from "react";

// Define the shape of data ApexSankey expects
interface SankeyData {
  nodes: Array<{ id: string; title: string }>;
  links: Array<{ source: string; target: string; value: number }>;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
  options?: any;
}

export default function SankeyChart({ data, height = 300 }: SankeyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues if library accesses window
    const initChart = async () => {
      // @ts-ignore - apexsankey might not have type definitions
      const ApexSankey = (await import("apexsankey")).default;

      if (chartRef.current) {
        // Clear previous chart if any
        if (chartInstance.current) {
          // ApexSankey doesn't seem to have a standard destroy method in all versions,
          // but clearing innerHTML is a safe fallback for re-rendering from scratch.
          chartRef.current.innerHTML = "";
        }

        const options = {
          width: "100%",
          height: height,
          canvasStyle: "border: none",
          spacing: 10,
          nodeWidth: 20,
          fontFamily: "monospace",
          fontSize: "14px",
          fontWeight: 600,
          edgeColor: "path", // 'path' or 'input' or 'output' or 'gradient'
          nodeBorder: 0,
          tooltip: {
            theme: "dark",
          },
          theme: {
            mode: "dark",
          },
        };

        const chart = new ApexSankey(chartRef.current, options as any);
        (chart as any).render({ nodes: data.nodes, links: data.links });
        chartInstance.current = chart;
      }
    };

    if (data && data.nodes && data.links) {
      initChart();
    }

    return () => {
      // Cleanup if needed
    };
  }, [data, height]);

  return (
    <div
      ref={chartRef}
      className="w-full flex justify-center text-industrial-200"
    />
  );
}
