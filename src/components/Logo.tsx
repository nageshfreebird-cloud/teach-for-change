import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "w-16 h-16", showText = false }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 300 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer Ring Sectors (The Colorful Lightbulb Ring with Icons) */}
        
        {/* 1. Top-Left Green Segment (Magnifying glass) */}
        <path
          d="M 58 100 A 110 110 0 0 1 150 40 L 150 75 A 75 75 0 0 0 88 115 Z"
          fill="#8CC63F"
          opacity="0.85"
        />
        {/* Magnifying Glass Icon inside Top-Left */}
        <path
          d="M 95 68 A 4 4 0 1 1 87 60 A 4 4 0 0 1 95 68 M 92 71 L 97 76"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* 2. Top-Right Blue Segment (Book) */}
        <path
          d="M 150 40 A 110 110 0 0 1 242 100 L 212 115 A 75 75 0 0 0 150 75 Z"
          fill="#709CC6"
          opacity="0.9"
        />
        {/* Book Icon inside Top-Right */}
        <path
          d="M 185 60 h 10 v 12 h -10 z M 185 64 h 10 M 185 68 h 10"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Mid-Right Yellow Segment (Numbers 123) */}
        <path
          d="M 242 100 A 110 110 0 0 1 260 170 L 225 165 A 75 75 0 0 0 212 115 Z"
          fill="#F5B941"
        />
        {/* '1 2 3' Text in Mid-Right */}
        <text
          x="235"
          y="138"
          fill="white"
          fontSize="11"
          fontWeight="900"
          fontFamily="sans-serif"
          transform="rotate(15, 235, 138)"
        >
          123
        </text>

        {/* 4. Bottom-Right Green Segment (Pen) */}
        <path
          d="M 260 170 A 110 110 0 0 1 216 250 L 191 223 A 75 75 0 0 0 225 165 Z"
          fill="#8BC34A"
          opacity="0.9"
        />
        {/* Pen/Pencil Icons inside Bottom-Right */}
        <path
          d="M 215 200 L 223 208 M 218 197 L 226 205 M 220 210 L 215 215"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 5. Bottom-Right Blue/Globe Segment */}
        <path
          d="M 216 250 A 110 110 0 0 1 163 290 L 153 252 A 75 75 0 0 0 191 223 Z"
          fill="#709CC6"
        />
        {/* Globe icon inside Bottom-Right Blue */}
        <circle cx="178" cy="248" r="8" stroke="white" strokeWidth="1.5" />
        <path d="M 170 248 h 16 M 178 240 a 8 8 0 0 1 0 16" stroke="white" strokeWidth="1" />

        {/* 6. Bottom-Left Red Segment (Flask) */}
        <path
          d="M 137 290 A 110 110 0 0 1 84 250 L 109 223 A 75 75 0 0 0 147 252 Z"
          fill="#E65F5F"
        />
        {/* Flask Icon inside Bottom-Left Red */}
        <path
          d="M 115 245 L 123 245 M 119 245 v -5 M 115 252 h 8 L 121 247 v -2 h -4 v 2 Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 7. Mid-Left Yellow Segment (Atom/Science) */}
        <path
          d="M 84 250 A 110 110 0 0 1 40 170 L 75 165 A 75 75 0 0 0 109 223 Z"
          fill="#F5B941"
        />
        {/* Atom Icon inside Mid-Left */}
        <ellipse cx="62" cy="205" rx="3" ry="8" transform="rotate(30, 62, 205)" stroke="white" strokeWidth="1" fill="none" />
        <ellipse cx="62" cy="205" rx="3" ry="8" transform="rotate(-30, 62, 205)" stroke="white" strokeWidth="1" fill="none" />

        {/* 8. Top-Left Mid-Green Segment (Palette) */}
        <path
          d="M 40 170 A 110 110 0 0 1 58 100 L 88 115 A 75 75 0 0 0 75 165 Z"
          fill="#009688"
          opacity="0.8"
        />
        {/* Palette Icon inside Top-Left Mid-Green */}
        <path
          d="M 68 135 a 6 6 0 1 1 -2 -4 c 1 0 2 1 2 4 z"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="68" cy="132" r="0.75" fill="white" />
        <circle cx="71" cy="135" r="0.75" fill="white" />

        {/* --- Inner White Lightbulb Body --- */}
        <path
          d="M 150 74 C 103 74 65 112 65 158 C 65 192 84 220 110 236 L 110 285 L 190 285 L 190 236 C 216 220 235 192 235 158 C 235 112 197 74 150 74 Z"
          fill="white"
        />

        {/* --- TEACH FOR CHANGE TEXT --- */}
        {/* TEACH */}
        <text
          x="150"
          y="152"
          fill="#00A3E0"
          fontSize="24"
          fontWeight="900"
          fontFamily="'Inter', 'Space Grotesk', 'Arial Black', sans-serif"
          textAnchor="middle"
          letterSpacing="-0.5"
        >
          TEACH
        </text>

        {/* FOR */}
        <text
          x="150"
          y="180"
          fill="#E65F5F"
          fontSize="14"
          fontWeight="800"
          fontFamily="'Inter', 'Space Grotesk', sans-serif"
          textAnchor="middle"
          letterSpacing="1"
        >
          FOR
        </text>

        {/* CHANGE */}
        <text
          x="150"
          y="220"
          fill="#F5B941"
          fontSize="26"
          fontWeight="900"
          fontFamily="'Inter', 'Space Grotesk', 'Arial Black', sans-serif"
          textAnchor="middle"
          letterSpacing="-0.5"
        >
          CHANGE
        </text>

        {/* --- Lightbulb Base (Screw thread cap) --- */}
        {/* Thread 1 */}
        <rect
          x="102"
          y="300"
          width="96"
          height="14"
          rx="7"
          fill="#CCCCCC"
        />
        {/* Thread 2 */}
        <rect
          x="102"
          y="320"
          width="96"
          height="14"
          rx="7"
          fill="#C0C0C0"
        />
        {/* Thread 3 */}
        <rect
          x="102"
          y="340"
          width="96"
          height="14"
          rx="7"
          fill="#B3B3B3"
        />
        {/* Bottom Rounded Cap */}
        <path
          d="M 122 360 C 122 380 178 380 178 360 Z"
          fill="#999999"
        />
      </svg>
      {showText && (
        <span className="mt-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          Teach For Change
        </span>
      )}
    </div>
  );
}
