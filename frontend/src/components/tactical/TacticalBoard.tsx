import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Modality } from '../../types';

interface Props {
  children: ReactNode;
  droppableId?: string;
  teamName?: string;
  formationName?: string;
  scheme?: string;
  modality?: Modality;
}

export const TacticalBoard = forwardRef<HTMLDivElement, Props>(
  function TacticalBoard(
    { children, droppableId = 'field', teamName, formationName, scheme, modality = 'FUTEBOL' },
    ref,
  ) {
    const { setNodeRef } = useDroppable({ id: droppableId });

    const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    const isFutsal = modality === 'FUTSAL';

    return (
      <div className={`w-full ${isFutsal ? 'max-w-sm mx-auto' : ''}`}>
        {(teamName || formationName || scheme) && (
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            {teamName && (
              <span className="font-semibold text-gray-900">{teamName}</span>
            )}
            {formationName && (
              <span className="text-gray-600">— {formationName}</span>
            )}
            {scheme && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                isFutsal
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {scheme}
              </span>
            )}
          </div>
        )}
        <div
          ref={setRefs}
          className={`relative w-full overflow-hidden rounded-xl border-2 select-none touch-none ${
            isFutsal
              ? 'aspect-[3/4] border-sky-700 bg-sky-600'
              : 'aspect-[2/3] border-emerald-700 bg-emerald-600'
          }`}
          style={{
            backgroundImage: isFutsal
              ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 25px, rgba(255,255,255,0.0) 25px 50px)'
              : 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 30px, rgba(255,255,255,0.0) 30px 60px)',
          }}
        >
          {isFutsal ? <FutsalCourtLines /> : <FieldLines />}
          {children}
        </div>
      </div>
    );
  },
);

function FieldLines() {
  return (
    <svg
      viewBox="0 0 100 150"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="96"
        height="146"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeWidth="0.4" />
      <circle
        cx="50"
        cy="75"
        r="9"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="75" r="0.6" fill="white" />
      <rect
        x="30"
        y="2"
        width="40"
        height="16"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="40"
        y="2"
        width="20"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="12" r="0.6" fill="white" />
      <rect
        x="30"
        y="132"
        width="40"
        height="16"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="40"
        y="142"
        width="20"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="138" r="0.6" fill="white" />
    </svg>
  );
}

function FutsalCourtLines() {
  return (
    <svg
      viewBox="0 0 100 160"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="94"
        height="154"
        rx="2"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
      />
      <line x1="3" y1="80" x2="97" y2="80" stroke="white" strokeWidth="0.4" />
      <circle
        cx="50"
        cy="80"
        r="8"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="80" r="0.6" fill="white" />
      {/* Top penalty area (semicircle) */}
      <path
        d="M 30 3 A 20 20 0 0 1 70 3"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="16" r="0.5" fill="white" />
      {/* Bottom penalty area (semicircle) */}
      <path
        d="M 30 157 A 20 20 0 0 0 70 157"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="144" r="0.5" fill="white" />
      {/* Corner arcs */}
      <path d="M 3 6 A 3 3 0 0 1 6 3" fill="none" stroke="white" strokeWidth="0.3" />
      <path d="M 94 3 A 3 3 0 0 1 97 6" fill="none" stroke="white" strokeWidth="0.3" />
      <path d="M 6 157 A 3 3 0 0 1 3 154" fill="none" stroke="white" strokeWidth="0.3" />
      <path d="M 97 154 A 3 3 0 0 1 94 157" fill="none" stroke="white" strokeWidth="0.3" />
    </svg>
  );
}
