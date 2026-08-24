import React from 'react';

interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 ${
            active === tab.id ? 'bg-red-900 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
