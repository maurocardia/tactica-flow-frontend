import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, size = 'md' }) => {
  const dims = size === 'sm' ? 'w-8 h-4.5' : 'w-9 h-5';
  const knob = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${dims} flex items-center rounded-full p-0.5 transition-colors shrink-0 disabled:opacity-40 ${
        checked ? 'bg-red-600 justify-end' : 'bg-slate-300 justify-start'
      }`}
    >
      <span className={`${knob} bg-white rounded-full shadow-md`} />
    </button>
  );
};

export default Toggle;
