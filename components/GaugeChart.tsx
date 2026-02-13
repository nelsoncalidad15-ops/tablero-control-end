import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number; // 0 to 100
  label: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, label }) => {
  // Normalize value
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  
  const data = [
    { name: 'Value', value: normalizedValue },
    { name: 'Remaining', value: 100 - normalizedValue },
  ];

  const COLORS = ['#3B82F6', '#E5E7EB']; // Blue and Gray

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <h4 className="text-sm font-semibold text-slate-600 absolute top-2">{label}</h4>
      <div className="w-full h-[140px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%" // Half circle from bottom
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell key="cell-0" fill={COLORS[0]} />
              <Cell key="cell-1" fill={COLORS[1]} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-3xl font-bold text-slate-700">{Math.round(normalizedValue)}%</span>
      </div>
      <div className="flex justify-between w-full px-8 text-xs text-slate-400 -mt-2">
          <span>0%</span>
          <span>100%</span>
      </div>
    </div>
  );
};

export default GaugeChart;