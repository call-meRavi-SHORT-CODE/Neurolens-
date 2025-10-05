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
    <div className="flex flex-col items-center space-y-6">
      <div className="relative" style={{ width: size, height: size / 2 + 50 }}>
        <svg
          width={size}
          height={size / 2 + 50}
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
          
        </svg>
        
        {/* Value display - positioned with proper spacing */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center w-full px-4">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {Math.round(value)}%
          </div>
          <div className="text-lg font-medium text-gray-600">
            {getRiskLevel(value)}
          </div>
        </div>
      </div>
    </div>
  );
};
