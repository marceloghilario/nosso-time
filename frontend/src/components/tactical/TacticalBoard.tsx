import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  children: ReactNode;
  droppableId?: string;
  teamName?: string;
  formationName?: string;
  scheme?: string;
}

export const TacticalBoard = forwardRef<HTMLDivElement, Props>(
  function TacticalBoard(
    { children, droppableId = 'field', teamName, formationName, scheme },
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

    return (
      <div className="w-full">
        {(teamName || formationName || scheme) && (
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            {teamName && (
              <span className="font-semibold text-gray-900">{teamName}</span>
            )}
            {formationName && (
              <span className="text-gray-600">— {formationName}</span>
            )}
            {scheme && (
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {scheme}
              </span>
            )}
          </div>
        )}
        <div
          ref={setRefs}
          className="relative w-full aspect-[2/3] overflow-hidden rounded-xl border-2 border-emerald-700 bg-emerald-600 select-none touch-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 30px, rgba(255,255,255,0.0) 30px 60px)',
          }}
        >
          <FieldLines />
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
