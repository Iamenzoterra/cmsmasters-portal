'use client';

import { useState } from 'react';
import { cn } from '../theme/utils';

interface DonutChartProps {
  value: number;
  label: string;
  color?: string;
  onClick?: () => void;
  className?: string;
}

const DEFAULT_COLOR = '#3b82f6';

const RADIUS = 50;
const CX = 60;
const CY = 60;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ value, label, color, onClick, className }: DonutChartProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const clamped = Math.min(100, Math.max(0, value));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const arcColor = color ?? DEFAULT_COLOR;

  return (
    <div
      className={cn('inline-flex items-center justify-center', onClick && 'cursor-pointer', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${clamped}% ${label}`}
      >
        {/* Background ring */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke="#27272a"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Foreground arc */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ opacity: isHovered ? 1 : 0.85, transition: 'opacity 0.15s ease' }}
        />
        {/* Percentage text */}
        <text
          x={CX}
          y={58}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="monospace"
          fontSize="18"
          fontWeight="700"
          fill={isHovered ? '#f4f4f5' : '#a1a1aa'}
          style={{ transition: 'fill 0.15s ease' }}
        >
          {clamped}%
        </text>
        {/* Label text */}
        <text
          x={CX}
          y={74}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill={isHovered ? '#a1a1aa' : '#71717a'}
          style={{ transition: 'fill 0.15s ease' }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
