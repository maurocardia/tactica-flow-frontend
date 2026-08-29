// src/components/sidebar/flow/FlowNodeCard.tsx
import React from 'react';
import {
  MessageSquare,
  ListFilter,
  Bot,
  UserCheck,
  Clock,
  Zap,
  Trash2,
  Edit2,
  Copy
} from 'lucide-react';
import { BotFlowNode, NodeType } from '@/types/bot';

interface FlowNodeCardProps {
  node: BotFlowNode;
  isSelected: boolean;
  isHoveredByConnection?: boolean;
  activeConnecting?: {
    sourceNodeId: string;
    sourcePortId?: string;
  } | null;
  onSelect: (nodeId: string) => void;
  onEdit: (node: BotFlowNode) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (node: BotFlowNode) => void;
  onStartConnection: (sourceNodeId: string, sourcePortId?: string, e?: React.MouseEvent) => void;
  onEndConnection: (targetNodeId: string) => void;
  onMouseDownDrag: (nodeId: string, e: React.MouseEvent) => void;
}

const META_BY_TYPE: Record<NodeType, { label: string; icon: any; headerBg: string; border: string; iconColor: string }> = {
  TRIGGER: {
    label: 'Disparador / Palabras',
    icon: Zap,
    headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
    border: 'border-amber-300 dark:border-amber-700',
    iconColor: 'text-amber-500'
  },
  STATIC_REPLY: {
    label: 'Mensaje de Texto',
    icon: MessageSquare,
    headerBg: 'bg-gradient-to-r from-[#9e1114] to-[#c71c20] text-white',
    border: 'border-red-300 dark:border-red-800',
    iconColor: 'text-red-600'
  },
  OPTIONS_MENU: {
    label: 'Menú Interactivo',
    icon: ListFilter,
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    iconColor: 'text-emerald-600'
  },
  CALL_AI: {
    label: 'Agente de IA',
    icon: Bot,
    headerBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    border: 'border-purple-300 dark:border-purple-700',
    iconColor: 'text-purple-600'
  },
  HANDOFF: {
    label: 'Derivación Asesor',
    icon: UserCheck,
    headerBg: 'bg-gradient-to-r from-rose-600 to-red-600 text-white',
    border: 'border-rose-300 dark:border-rose-700',
    iconColor: 'text-rose-600'
  },
  DELAY: {
    label: 'Espera / Delay',
    icon: Clock,
    headerBg: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white',
    border: 'border-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-600'
  },
  CONDITION: {
    label: 'Condición',
    icon: Zap,
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
    border: 'border-blue-300 dark:border-blue-700',
    iconColor: 'text-blue-600'
  }
};

export const FlowNodeCard: React.FC<FlowNodeCardProps> = ({
  node,
  isSelected,
  isHoveredByConnection,
  activeConnecting,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onStartConnection,
  onEndConnection,
  onMouseDownDrag
}) => {
  const meta = META_BY_TYPE[node.type] || META_BY_TYPE.STATIC_REPLY;
  const Icon = meta.icon;

  const isTrigger = node.type === 'TRIGGER';
  const hasOptions = node.type === 'OPTIONS_MENU' && (node.data?.options?.length ?? 0) > 0;
  const isConnectingTarget = activeConnecting && activeConnecting.sourceNodeId !== node.id && !isTrigger;

  return (
    <div
      id={`flow-node-${node.id}`}
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (activeConnecting && activeConnecting.sourceNodeId !== node.id) {
          onEndConnection(node.id);
        } else {
          onSelect(node.id);
        }
      }}
      onMouseUp={(e) => {
        if (activeConnecting && activeConnecting.sourceNodeId !== node.id) {
          onEndConnection(node.id);
        }
      }}
      className={`absolute w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-md select-none border-2 transition-all duration-150 ${
        isSelected
          ? 'ring-4 ring-red-500/30 border-[#9e1114] dark:border-red-500 shadow-xl z-10'
          : isConnectingTarget
          ? 'ring-4 ring-emerald-500/30 border-emerald-500 dark:border-emerald-400 shadow-xl z-10 cursor-pointer'
          : isHoveredByConnection
          ? 'ring-4 ring-red-400/40 border-[#b81519] shadow-lg z-10 scale-[1.01]'
          : `${meta.border} hover:shadow-lg z-0`
      }`}
    >
      {/* Input Handle (Puerto de Entrada - Superior Central) */}
      {!isTrigger && (
        <div
          id={`port-in-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onEndConnection(node.id);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection(node.id);
          }}
          title="Toca o suelta para conectar a la entrada de este bloque"
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-30 shadow-sm ${
            isConnectingTarget
              ? 'bg-emerald-500 border-emerald-600 scale-125 animate-bounce'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-300 hover:scale-125 hover:bg-[#9e1114] hover:border-red-700'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isConnectingTarget ? 'bg-white' : 'bg-slate-400 dark:bg-slate-300'}`} />
        </div>
      )}

      {/* Header del Bloque (Área para arrastrar) */}
      <div
        onMouseDown={(e) => onMouseDownDrag(node.id, e)}
        className={`px-3.5 py-2.5 rounded-t-[14px] flex items-center justify-between cursor-grab active:cursor-grabbing shadow-xs ${meta.headerBg}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs truncate">
            {node.data?.name || node.title || meta.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEdit(node)}
            title="Editar bloque"
            className="p-1 rounded-md hover:bg-white/25 transition-colors text-white cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(node)}
            title="Duplicar bloque"
            className="p-1 rounded-md hover:bg-white/25 transition-colors text-white cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!isTrigger && (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              title="Eliminar bloque"
              className="p-1 rounded-md hover:bg-red-700/80 transition-colors text-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo del Bloque */}
      <div className="p-3 flex flex-col gap-2 text-xs bg-white dark:bg-slate-900 rounded-b-[14px]">
        {/* Palabras Clave (si aplica) */}
        {(isTrigger || (node.data?.keywords && node.data.keywords.length > 0)) && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Palabras activadoras:
            </span>
            <div className="flex flex-wrap gap-1">
              {node.data?.keywords && node.data.keywords.length > 0 ? (
                node.data.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10.5px] font-medium"
                  >
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">
                  Sin palabras clave definidas
                </span>
              )}
            </div>
          </div>
        )}

        {/* Texto de Respuesta / Mensaje */}
        {node.data?.replyText && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Mensaje:
            </span>
            <p className="text-slate-700 dark:text-slate-200 text-xs bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700 line-clamp-3 whitespace-pre-line">
              {node.data.replyText}
            </p>
          </div>
        )}

        {/* Opciones Interactivas (si es MENU) */}
        {hasOptions && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Opciones de salida:
            </span>
            {node.data?.options?.map((opt, optIdx) => {
              const isOptionActive = activeConnecting?.sourceNodeId === node.id && activeConnecting?.sourcePortId === (opt.id || `opt_${optIdx}`);
              return (
                <div
                  key={opt.id || optIdx}
                  className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-900 dark:text-emerald-200 relative group"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-4">
                    <span className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {optIdx + 1}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </div>

                  {/* Handle individual de salida por opción (Rojo Táctica) */}
                  <div
                    id={`port-out-${node.id}-${opt.id || optIdx}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onStartConnection(node.id, opt.id || `opt_${optIdx}`, e);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartConnection(node.id, opt.id || `opt_${optIdx}`, e);
                    }}
                    title={`Toca o arrastra para conectar la opción "${opt.label}"`}
                    className={`absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#9e1114] border-2 border-white dark:border-slate-800 flex items-center justify-center cursor-pointer transition-all shadow-md z-30 ${
                      isOptionActive ? 'ring-4 ring-red-400 scale-125 animate-pulse' : 'hover:scale-125 hover:bg-red-700'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delay */}
        {node.type === 'DELAY' && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Pausa de <strong>{node.data?.delaySeconds || 2} segundos</strong> antes de continuar.</span>
          </div>
        )}

        {/* Agente IA */}
        {node.type === 'CALL_AI' && (
          <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
            <Bot className="w-4 h-4 shrink-0" />
            <span>Responde de forma autónoma con la Base de Conocimiento activa.</span>
          </div>
        )}

        {/* Handoff */}
        {node.type === 'HANDOFF' && (
          <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Pasa la conversación a estado Asesor Humano.</span>
          </div>
        )}
      </div>

      {/* Default Output Handle (Inferior - Rojo Táctica) si no es menú múltiple */}
      {!hasOptions && (() => {
        const isDefaultActive = activeConnecting?.sourceNodeId === node.id && (activeConnecting?.sourcePortId === 'default' || !activeConnecting?.sourcePortId);
        return (
          <div
            id={`port-out-${node.id}-default`}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartConnection(node.id, 'default', e);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection(node.id, 'default', e);
            }}
            title="Toca o arrastra para conectar con el siguiente bloque"
            className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#9e1114] border-2 border-white dark:border-slate-800 flex items-center justify-center cursor-pointer transition-all shadow-md z-30 ${
              isDefaultActive ? 'ring-4 ring-red-400 scale-125 animate-pulse' : 'hover:scale-125 hover:bg-red-700'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        );
      })()}
    </div>
  );
};
