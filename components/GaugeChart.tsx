
import React from 'react';

interface GaugeChartProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  color?: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, label, min = 0, max = 100, color = "white" }) => {
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = ((clampedValue - min) / (max - min)) * 100;
  
  // SVG arc calculations
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // Half circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Needle rotation
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full aspect-[2/1] flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 180 100" className="w-full h-full drop-shadow-2xl">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background Track */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress Track */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            filter="url(#glow)"
          />

          {/* Needle */}
          <g transform={`translate(90, 90) rotate(${rotation})`}>
            <path
              d="M -2 0 L 0 -75 L 2 0 Z"
              fill={color}
              className="transition-transform duration-1000 ease-out"
            />
            <circle r="5" fill={color} />
          </g>

          {/* Labels */}
          <text x="20" y="95" fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="bold" textAnchor="middle">{min}%</text>
          <text x="160" y="95" fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="bold" textAnchor="middle">{max}%</text>
        </svg>
      </div>
    </div>
  );
};

export default GaugeChart;
