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
          className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 shadow-2xs ${
            active === tab.id
              ? 'bg-[#9e1114] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
