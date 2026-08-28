// src/components/sidebar/flow/FlowPalette.tsx
import React from 'react';
import {
  MessageSquare,
  ListFilter,
  Bot,
  UserCheck,
  GitFork,
  Clock,
  Zap,
  Plus
} from 'lucide-react';
import { NodeType } from '@/types/bot';

interface BlockTypeMeta {
  type: NodeType;
  label: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
}

export const PALETTE_BLOCKS: BlockTypeMeta[] = [
  {
    type: 'TRIGGER',
    label: 'Disparador',
    desc: 'Palabras clave iniciales que activan el bot',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800'
  },
  {
    type: 'STATIC_REPLY',
    label: 'Mensaje de Texto',
    desc: 'Envía una respuesta o saludo de texto fijo',
    icon: MessageSquare,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800'
  },
  {
    type: 'OPTIONS_MENU',
    label: 'Menú de Opciones',
    desc: 'Bifurca el camino según la opción del cliente',
    icon: ListFilter,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    type: 'CALL_AI',
    label: 'Agente de IA',
    desc: 'Responde consultando la Base de Conocimiento',
    icon: Bot,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800'
  },
  {
    type: 'HANDOFF',
    label: 'Derivar a Asesor',
    desc: 'Transfiere el chat a un asesor humano',
    icon: UserCheck,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800'
  },
  {
    type: 'DELAY',
    label: 'Espera / Delay',
    desc: 'Simula tiempo de espera o tipeo humano',
    icon: Clock,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-200 dark:border-slate-700'
  }
];

interface FlowPaletteProps {
  onAddBlock: (type: NodeType) => void;
}

export const FlowPalette: React.FC<FlowPaletteProps> = ({ onAddBlock }) => {
  return (
    <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 select-none">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Bloques de Flujo
        </h3>
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
          Haz clic o arrastra para añadir al lienzo
        </p>
      </div>

      <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1">
        {PALETTE_BLOCKS.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.type}
              type="button"
              onClick={() => onAddBlock(b.type)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/tactica-flow-block', b.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-grab active:cursor-grabbing hover:shadow-sm hover:scale-[1.02] transition-all bg-white dark:bg-slate-800/80 ${b.border}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${b.bg} ${b.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {b.label}
                  </span>
                  <Plus className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  {b.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
