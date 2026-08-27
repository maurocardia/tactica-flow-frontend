import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { KnowledgeBase, KnowledgeDocument } from '@/types/knowledgeBase';
import { ApiService } from '@/services/api.service';
import { Toggle } from '@/components/ui/Toggle';
import { KbDocumentList } from './KbDocumentList';
import { KbUploader } from './KbUploader';

interface Props {
  base: KnowledgeBase;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

export const KbCard: React.FC<Props> = ({ base, onToggleActive, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      setDocuments(await ApiService.getKbDocuments(base.id));
    } catch (err) {
      console.error('[KbCard] Error al cargar documentos:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (expanded && documents.length === 0) loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const deleteDoc = async (docId: number) => {
    try {
      await ApiService.deleteKbDocument(base.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('[KbCard] Error al eliminar documento:', err);
    }
  };

  return (
    <div className={`border rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs transition-all ${base.isActive ? 'border-red-400 dark:border-red-700 bg-red-50/70 dark:bg-red-950/40 ring-1 ring-red-500/20' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90'}`}>
      <div className="flex items-start gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="mt-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{base.title}</p>
          {base.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">{base.description}</p>}
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0 cursor-pointer transition-colors" title="Eliminar base">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1">
        <span>Base activa para el bot</span>
        <Toggle size="sm" checked={base.isActive} onChange={onToggleActive} />
      </div>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex flex-col gap-2">
          <KbDocumentList documents={documents} loading={loadingDocs} onDelete={deleteDoc} />
          <KbUploader knowledgeBaseId={base.id} onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])} />
        </div>
      )}
    </div>
  );
};

export default KbCard;
