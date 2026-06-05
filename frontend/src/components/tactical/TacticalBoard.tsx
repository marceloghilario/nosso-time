import type { FormationScheme, Modality } from '../../types';
import { FORMATION_SLOTS } from '../../utils/formationSchemes';
import { PLAYER_POSITION_LABELS } from '../../utils/constants';

interface TacticalBoardProps {
  modality?: Modality;
  scheme: FormationScheme;
}

function FutebolField() {
  return (
    <g stroke="white" strokeWidth="1.2" fill="none" opacity="0.7">
      {/* Outer border */}
      <rect x="5" y="2" width="90" height="96" rx="1" />
      {/* Center line */}
      <line x1="5" y1="50" x2="95" y2="50" />
      {/* Center circle */}
      <circle cx="50" cy="50" r="12" />
      <circle cx="50" cy="50" r="0.8" fill="white" />
      {/* Penalty area bottom (defense) */}
      <rect x="25" y="2" width="50" height="18" />
      {/* Goal area bottom */}
      <rect x="35" y="2" width="30" height="7" />
      {/* Penalty spot bottom */}
      <circle cx="50" cy="13" r="0.8" fill="white" />
      {/* Penalty area top (attack) */}
      <rect x="25" y="80" width="50" height="18" />
      {/* Goal area top */}
      <rect x="35" y="91" width="30" height="7" />
      {/* Penalty spot top */}
      <circle cx="50" cy="87" r="0.8" fill="white" />
      {/* Corner arcs */}
      <path d="M5,5 A3,3 0 0,1 8,2" />
      <path d="M92,2 A3,3 0 0,1 95,5" />
      <path d="M5,95 A3,3 0 0,0 8,98" />
      <path d="M92,98 A3,3 0 0,0 95,95" />
    </g>
  );
}

function FutsalCourt() {
  return (
    <g stroke="white" strokeWidth="1.2" fill="none" opacity="0.7">
      {/* Outer border with rounded corners */}
      <rect x="5" y="2" width="90" height="96" rx="3" />
      {/* Center line */}
      <line x1="5" y1="50" x2="95" y2="50" />
      {/* Center circle */}
      <circle cx="50" cy="50" r="10" />
      <circle cx="50" cy="50" r="0.8" fill="white" />
      {/* Penalty area bottom (defense) - semicircle */}
      <path d="M 32,2 A 22,22 0 0,0 68,2" />
      {/* Free throw mark bottom */}
      <circle cx="50" cy="14" r="0.8" fill="white" />
      {/* Second penalty mark bottom */}
      <circle cx="50" cy="22" r="0.6" fill="white" />
      {/* Penalty area top (attack) - semicircle */}
      <path d="M 32,98 A 22,22 0 0,1 68,98" />
      {/* Free throw mark top */}
      <circle cx="50" cy="86" r="0.8" fill="white" />
      {/* Second penalty mark top */}
      <circle cx="50" cy="78" r="0.6" fill="white" />
      {/* Substitution zones */}
      <line x1="5" y1="42" x2="3" y2="42" strokeWidth="2" />
      <line x1="5" y1="58" x2="3" y2="58" strokeWidth="2" />
      <line x1="95" y1="42" x2="97" y2="42" strokeWidth="2" />
      <line x1="95" y1="58" x2="97" y2="58" strokeWidth="2" />
    </g>
  );
}

export default function TacticalBoard({ modality = 'FUTEBOL', scheme }: TacticalBoardProps) {
  const slots = FORMATION_SLOTS[scheme];
  const isFutsal = modality === 'FUTSAL';

  return (
    <div className="w-full max-w-md mx-auto">
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-xl shadow-inner ${
          isFutsal ? 'bg-sky-700' : 'bg-green-700'
        }`}
        style={{ aspectRatio: isFutsal ? '5/8' : '2/3' }}
      >
        {isFutsal ? <FutsalCourt /> : <FutebolField />}

        {slots.map((slot, i) => (
          <g key={i}>
            <circle
              cx={slot.x}
              cy={100 - slot.y}
              r="3.5"
              fill="white"
              fillOpacity="0.9"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.4"
            />
            <text
              x={slot.x}
              y={100 - slot.y + 0.8}
              textAnchor="middle"
              fontSize="2.2"
              fontWeight="bold"
              fill="#1e293b"
            >
              {PLAYER_POSITION_LABELS[slot.label].slice(0, 3).toUpperCase()}
            </text>
            <text
              x={slot.x}
              y={100 - slot.y + 5.5}
              textAnchor="middle"
              fontSize="1.8"
              fill="white"
              fillOpacity="0.9"
            >
              {PLAYER_POSITION_LABELS[slot.label]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
