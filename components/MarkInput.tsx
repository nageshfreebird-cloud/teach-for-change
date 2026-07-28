import React, { useState, useEffect } from 'react';
import { Minus, Plus, HelpCircle } from 'lucide-react';

interface MarkInputProps {
  label: string;
  value: number | null;
  max?: number;
  onChange: (newValue: number | null) => void;
  saving?: boolean;
}

export default function MarkInput({ label, value, max = 10, onChange, saving = false }: MarkInputProps) {
  const [localVal, setLocalVal] = useState<string>(value !== null ? String(value) : '');

  // Keep in sync with parent value
  useEffect(() => {
    setLocalVal(value !== null ? String(value) : '');
  }, [value]);

  const handleIncrement = () => {
    const current = value !== null ? value : 0;
    if (current < max) {
      const next = current + 1;
      onChange(next);
    }
  };

  const handleDecrement = () => {
    const current = value !== null ? value : 0;
    if (current > 0) {
      const next = current - 1;
      onChange(next);
    } else if (current === 0) {
      // Allow clearing if they decrement from 0, or keep it at 0
      onChange(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Numeric only
    setLocalVal(rawValue);

    if (rawValue === '') {
      onChange(null);
    } else {
      const parsed = parseInt(rawValue, 10);
      if (parsed >= 0 && parsed <= max) {
        onChange(parsed);
      } else if (parsed > max) {
        onChange(max);
        setLocalVal(String(max));
      }
    }
  };

  const handleBlur = () => {
    if (localVal === '') {
      onChange(null);
    } else {
      const parsed = parseInt(localVal, 10);
      if (isNaN(parsed) || parsed < 0) {
        onChange(0);
        setLocalVal('0');
      } else if (parsed > max) {
        onChange(max);
        setLocalVal(String(max));
      }
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between sm:space-x-4">
      <div className="flex-1 min-w-0 mr-2">
        <span className="text-xs font-bold text-slate-700 block truncate">{label}</span>
        <span className="text-[10px] text-slate-400 font-semibold block">Max: {max} marks</span>
      </div>

      <div className="flex items-center space-x-1">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 active:bg-slate-100 hover:border-slate-300 shadow-sm active:scale-95 transition-all text-slate-600 font-bold cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Text Input / Score Cell */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={localVal}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="-"
            className={`w-14 h-10 text-center font-bold text-lg rounded-lg border focus:outline-none focus:ring-4 transition-all ${
              saving 
                ? 'border-teal-300 bg-teal-50 text-teal-800 focus:ring-teal-100' 
                : value !== null
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 focus:border-teal-500 focus:ring-teal-50'
            }`}
          />
          {saving && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full animate-ping" />
          )}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 active:bg-slate-100 hover:border-slate-300 shadow-sm active:scale-95 transition-all text-slate-600 font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
