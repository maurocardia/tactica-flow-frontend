// src/components/sidebar/BotFlowModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Workflow,
  List,
  Sparkles,
  PlayCircle
} from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { BotFlowData, KeywordRule } from '@/types/bot';
import { FlowCanvas } from './flow/FlowCanvas';

export const BotFlowModal: React.FC<{
  onClose: () => void;
  onTest?: () => { text: string | null; matched: boolean };
}> = ({ onClose, onTest }) => {
  const [flowData, setFlowData] = useState<BotFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFlow();
  }, []);

  const loadFlow = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Intentar cargar flujo guardado en el servidor backend
      let savedFlow: BotFlowData | null = null;
      try {
        savedFlow = await ApiService.getBotFlow();
      } catch (e) {
        console.warn('[BotFlowModal] No se pudo obtener flujo del backend:', e);
      }

      // 2. Verificar si hay un borrador local reciente en localStorage
      let localDraft: BotFlowData | null = null;
      try {
        const rawDraft = localStorage.getItem('tactica_flow_draft');
        if (rawDraft) {
          localDraft = JSON.parse(rawDraft);
        }
      } catch (e) {
        console.warn('[BotFlowModal] Error leyendo borrador local:', e);
      }

      if (savedFlow && savedFlow.nodes && savedFlow.nodes.length > 0) {
        setFlowData(savedFlow);
      } else if (localDraft && localDraft.nodes && localDraft.nodes.length > 0) {
        setFlowData(localDraft);
      } else {
        // 3. Cargar reglas tradicionales y convertirlas a nodos visuales
        const rules = await ApiService.getBotRules();
        if (rules && rules.length > 0) {
          const convertedNodes = rules.map((r, i) => ({
            id: r.id,
            type: r.action === 'CALL_AI' ? 'CALL_AI' : r.action === 'HANDOFF' ? 'HANDOFF' : 'STATIC_REPLY',
            title: r.name,
            position: { x: 120 + (i % 3) * 320, y: 100 + Math.floor(i / 3) * 260 },
            data: {
              name: r.name,
              keywords: r.keywords,
              replyText: r.replyText,
              isActive: r.isActive
            }
          })) as any;

          setFlowData({
            id: 'main_flow',
            name: 'Flujo Principal de Atención',
            nodes: convertedNodes,
            connections: []
          });
        } else {
          setFlowData(null); // Usará el default
        }
      }
    } catch (err: any) {
      console.error('[BotFlowModal] Error al cargar flujo:', err);
      setError(err?.message || 'Error al cargar el flujo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlow = async (data: BotFlowData) => {
    setFlowData(data);
    try {
      localStorage.setItem('tactica_flow_draft', JSON.stringify(data));
    } catch (e) {
      // Ignore
    }
    await ApiService.saveBotFlow(data);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9e1114]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Cargando Diagramador Visual de Flujos...
          </span>
        </div>
      </div>
    );
  }

  return (
    <FlowCanvas
      initialData={flowData || undefined}
      onSaveFlow={handleSaveFlow}
      onClose={onClose}
    />
  );
};
