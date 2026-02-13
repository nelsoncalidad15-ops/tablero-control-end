import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, trend, icon }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
        </div>
        {icon && (
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            {icon}
          </div>
        )}
      </div>
      {subtitle && (
        <div className="mt-4 flex items-center text-sm">
          {trend === 'up' && <span className="text-green-600 font-medium mr-1">↑</span>}
          {trend === 'down' && <span className="text-red-600 font-medium mr-1">↓</span>}
          <span className="text-slate-400">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;