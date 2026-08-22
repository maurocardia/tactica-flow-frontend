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
    <div className={`border rounded-lg p-2.5 flex flex-col gap-2 ${base.isActive ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
      <div className="flex items-start gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="mt-0.5 text-slate-400 shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[13px] text-slate-800 truncate">{base.title}</p>
          {base.description && <p className="text-[11px] text-slate-500 truncate">{base.description}</p>}
        </div>
        <button onClick={onDelete} className="p-1 rounded-md hover:bg-red-50 text-red-500 shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-600">Base activa para el bot</span>
        <Toggle size="sm" checked={base.isActive} onChange={onToggleActive} />
      </div>

      {expanded && (
        <div className="border-t border-slate-200 pt-2 flex flex-col gap-2">
          <KbDocumentList documents={documents} loading={loadingDocs} onDelete={deleteDoc} />
          <KbUploader knowledgeBaseId={base.id} onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])} />
        </div>
      )}
    </div>
  );
};

export default KbCard;
