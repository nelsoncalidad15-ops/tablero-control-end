import React from 'react';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  className?: string;
  showDescriptor?: boolean;
}

const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'dark',
  className = '',
  showDescriptor = true,
}) => {
  const primary = variant === 'dark' ? '#1f2857' : '#ffffff';
  const secondary = variant === 'dark' ? '#525a7d' : 'rgba(255,255,255,0.72)';

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg viewBox="0 0 74 74" className="h-14 w-14 shrink-0" aria-hidden="true">
        <circle cx="37" cy="37" r="32" fill="none" stroke={primary} strokeWidth="3.4" />
        <path
          d="M18 17.5 31 45.5 37 32.4 43.1 45.5 56 17.5"
          fill="none"
          stroke={primary}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23.6 55.5 18 43.5 18 17.5 31 45.5 37 32.4 43.1 45.5 56 17.5 56 43.5 50.4 55.5"
          fill="none"
          stroke={primary}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex items-center gap-4">
        <div className="h-14 w-px" style={{ backgroundColor: secondary }} />
        <div>
          <div
            className="text-[3.2rem] font-black leading-none tracking-[-0.06em]"
            style={{ color: primary }}
          >
            Autosol
          </div>
          {showDescriptor && (
            <div
              className="mt-1 text-[10px] font-black uppercase tracking-[0.34em]"
              style={{ color: secondary }}
            >
              Concesionario Volkswagen
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandMark;
