import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  /** Optional numeric badge shown next to the label. */
  count?: number;
  /**
   * When set, clicking the tab is treated as a one-off navigation instead of
   * a real selection — the tab is never rendered as active. Useful for
   * "shortcut" tabs that link to another page (e.g. the tactical board).
   */
  navigateOnly?: boolean;
}

interface TabBarProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
}

function CountBadge({
  active,
  count,
}: {
  active: boolean;
  count: number;
}) {
  return (
    <span
      className={`ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'bg-slate-200 text-slate-600'
      }`}
    >
      {count}
    </span>
  );
}

export default function TabBar<T extends string>({
  items,
  value,
  onChange,
}: TabBarProps<T>) {
  return (
    <div
      role="tablist"
      className="inline-flex w-full bg-slate-100 rounded-xl p-1 gap-1 ring-1 ring-slate-200/70 shadow-inner overflow-x-auto"
    >
      {items.map((tab) => {
        const isActive = !tab.navigateOnly && tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 ${
              isActive
                ? 'bg-white text-primary-700 font-semibold shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`inline-flex shrink-0 ${
                isActive ? 'text-primary-600' : 'text-slate-500'
              }`}
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <CountBadge active={isActive} count={tab.count} />
            )}
          </button>
        );
      })}
    </div>
  );
}
