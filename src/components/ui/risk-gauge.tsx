import React from 'react';

interface RiskGaugeProps {
  value: number; // 0-100 percentage
  size?: number;
  strokeWidth?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  value, 
  size = 200, 
  strokeWidth = 20 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Color based on risk level
  const getColor = (val: number) => {
    if (val < 30) return '#10B981'; // Green
    if (val < 60) return '#F59E0B'; // Yellow
    if (val < 80) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getRiskLevel = (val: number) => {
    if (val < 30) return 'Low Risk';
    if (val < 60) return 'Medium Risk';
    if (val < 80) return 'High Risk';
    return 'Very High Risk';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg
          width={size}
          height={size / 2 + 20}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={getColor(value)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              transformOrigin: `${size / 2}px ${size / 2}px`,
              transform: 'rotate(-90deg)',
            }}
          />
          
          {/* Needle */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + Math.cos((value / 100) * Math.PI - Math.PI / 2) * (radius - 10)}
            y2={size / 2 + Math.sin((value / 100) * Math.PI - Math.PI / 2) * (radius - 10)}
            stroke="#1E40AF"
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Needle center */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="6"
            fill="#1E40AF"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        
        {/* Value display */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(value)}%
          </div>
          <div className="text-sm text-gray-600">
            {getRiskLevel(value)}
          </div>
        </div>
      </div>
    </div>
  );
};
