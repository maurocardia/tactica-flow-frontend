import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TagInputProps {
  suggestions: string[];
  onAdd: (tag: string) => void;
}

// Reemplaza <datalist>: dentro del Shadow DOM el datalist nativo no renderiza el dropdown de
// forma confiable, así que arma su propio menú de sugerencias.
export const TagInput: React.FC<TagInputProps> = ({ suggestions, onAdd }) => {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  const commit = () => {
    const tag = value.trim();
    if (!tag) return;
    onAdd(tag);
    setValue('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          className="flex-1 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-800 [color-scheme:light] focus:outline-none focus:border-red-400"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="Nueva etiqueta..."
        />
        <button
          onClick={commit}
          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-red-50"
              onMouseDown={() => { onAdd(s); setValue(''); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
