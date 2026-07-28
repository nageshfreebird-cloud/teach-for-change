import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "w-16 h-16", showText = false }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img src="/logo.png" alt="Teach For Change" className="w-full h-full object-contain drop-shadow-md" />
      {showText && (
        <span className="mt-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          Teach For Change
        </span>
      )}
    </div>
  );
}
