import React, { useState, useEffect, useRef } from 'react';

interface CompactCellProps {
  studentIndex: number;
  fieldIndex: number;
  value: number | null;
  max?: number;
  onChange: (newValue: number | null) => void;
  saving?: boolean;
}

export default function CompactCell({
  studentIndex,
  fieldIndex,
  value,
  max = 10,
  onChange,
  saving = false
}: CompactCellProps) {
  const [localVal, setLocalVal] = useState<string>(value !== null ? String(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync with parent value
  useEffect(() => {
    setLocalVal(value !== null ? String(value) : '');
  }, [value]);

  const validateAndSend = (valStr: string) => {
    if (valStr === '') {
      onChange(null);
    } else {
      const parsed = parseInt(valStr, 10);
      if (!isNaN(parsed)) {
        if (parsed >= 0 && parsed <= max) {
          onChange(parsed);
          setLocalVal(String(parsed));
        } else if (parsed > max) {
          onChange(max);
          setLocalVal(String(max));
        } else {
          onChange(0);
          setLocalVal('0');
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Numeric only
    const rawValue = e.target.value.replace(/\D/g, '');
    setLocalVal(rawValue);

    // Auto-save instantly if they type a valid number
    if (rawValue === '') {
      onChange(null);
    } else {
      const parsed = parseInt(rawValue, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= max) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    validateAndSend(localVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Spreadsheet navigation keys: Enter, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
    let targetStudentIndex = studentIndex;
    let targetFieldIndex = fieldIndex;

    if (e.key === 'Enter') {
      e.preventDefault();
      targetStudentIndex = studentIndex + 1; // Move to next student, same column
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetStudentIndex = studentIndex + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetStudentIndex = studentIndex - 1;
    } else if (e.key === 'ArrowRight') {
      // Move right only if cursor is at the end or text is empty, but for quick entry we can navigate directly if they hit arrows
      // To keep it simple, navigate directly
      targetFieldIndex = fieldIndex + 1;
    } else if (e.key === 'ArrowLeft') {
      targetFieldIndex = fieldIndex - 1;
    } else {
      // Standard typing
      return;
    }

    // Try to find the target input and focus it
    const nextInput = document.getElementById(`cell-${targetStudentIndex}-${targetFieldIndex}`);
    if (nextInput) {
      (nextInput as HTMLInputElement).focus();
      (nextInput as HTMLInputElement).select();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <input
        ref={inputRef}
        id={`cell-${studentIndex}-${fieldIndex}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localVal}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.target.select()}
        placeholder="-"
        className={`w-11 h-9 text-center font-bold font-mono text-sm rounded-md border focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-inner ${
          saving
            ? 'border-indigo-400 bg-indigo-50 text-indigo-800 focus:ring-indigo-200'
            : value !== null
              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900 focus:ring-emerald-200 hover:bg-emerald-100'
              : 'border-white/50 bg-white/50 text-slate-700 focus:border-indigo-500 focus:ring-indigo-200 hover:bg-white'
        }`}
      />
      {saving && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse border border-indigo-200" />
      )}
    </div>
  );
}
