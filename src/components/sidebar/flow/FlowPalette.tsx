// src/components/sidebar/flow/FlowPalette.tsx
import React from 'react';
import {
  MessageSquare,
  ListFilter,
  Bot,
  UserCheck,
  Clock,
  Zap,
  Plus,
  Image,
  Video,
  Mic,
  FileText,
  MousePointerClick,
  List,
  CheckCircle2
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
  group: 'Mensajes' | 'Interacción' | 'Lógica' | 'Terminal';
}

export const PALETTE_BLOCKS: BlockTypeMeta[] = [
  {
    type: 'TRIGGER',
    label: 'Disparador',
    desc: 'Palabras clave iniciales que activan el bot',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    group: 'Lógica'
  },
  {
    type: 'STATIC_REPLY',
    label: 'Mensaje de Texto',
    desc: 'Envía una respuesta o saludo de texto fijo',
    icon: MessageSquare,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    group: 'Mensajes'
  },
  {
    type: 'SEND_IMAGE',
    label: 'Enviar Imagen',
    desc: 'Manda una foto, con o sin texto (caption)',
    icon: Image,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200 dark:border-pink-800',
    group: 'Mensajes'
  },
  {
    type: 'SEND_VIDEO',
    label: 'Enviar Video',
    desc: 'Manda un video, opcionalmente como GIF en loop',
    icon: Video,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    group: 'Mensajes'
  },
  {
    type: 'SEND_AUDIO',
    label: 'Enviar Audio',
    desc: 'Manda un audio, opcionalmente como nota de voz',
    icon: Mic,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    group: 'Mensajes'
  },
  {
    type: 'SEND_DOCUMENT',
    label: 'Enviar Documento',
    desc: 'Manda un PDF, Word, Excel u otro archivo',
    icon: FileText,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    group: 'Mensajes'
  },
  {
    type: 'OPTIONS_MENU',
    label: 'Menú de Opciones',
    desc: 'Bifurca el camino según la opción del cliente',
    icon: ListFilter,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    group: 'Interacción'
  },
  {
    type: 'BUTTONS_REPLY',
    label: 'Respuestas',
    desc: 'Hasta 3 opciones rápidas (se muestran numeradas)',
    icon: MousePointerClick,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    group: 'Interacción'
  },
  {
    type: 'LIST_MESSAGE',
    label: 'Enviar Lista',
    desc: 'Hasta 10 opciones agrupadas por sección',
    icon: List,
    color: 'text-lime-600 dark:text-lime-400',
    bg: 'bg-lime-50 dark:bg-lime-950/40',
    border: 'border-lime-200 dark:border-lime-800',
    group: 'Interacción'
  },
  {
    type: 'CALL_AI',
    label: 'Agente de IA',
    desc: 'Responde consultando la Base de Conocimiento',
    icon: Bot,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    group: 'Lógica'
  },
  {
    type: 'HANDOFF',
    label: 'Contactar Asesor',
    desc: 'Deriva el chat a un asesor real y pausa el bot',
    icon: UserCheck,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    group: 'Lógica'
  },
  {
    type: 'DELAY',
    label: 'Espera / Delay',
    desc: 'Simula tiempo de espera o tipeo humano',
    icon: Clock,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-200 dark:border-slate-700',
    group: 'Lógica'
  },
  {
    type: 'FINISH_FLOW',
    label: 'Finalizar Flujo',
    desc: 'Termina la charla y levanta cualquier pausa de asesor',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    group: 'Terminal'
  }
];

const GROUP_ORDER: BlockTypeMeta['group'][] = ['Mensajes', 'Interacción', 'Lógica', 'Terminal'];

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

      <div className="p-2.5 flex flex-col gap-3 overflow-y-auto flex-1">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
              {group}
            </span>
            {PALETTE_BLOCKS.filter((b) => b.group === group).map((b) => {
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
                  className={`group flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-grab active:cursor-grabbing hover:shadow-sm hover:scale-[1.02] transition-all bg-white dark:bg-slate-800/80 ${b.border}`}
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
        ))}
      </div>
    </div>
  );
};
