import React from 'react';
import { Trash2, Loader2, FileText } from 'lucide-react';
import { KnowledgeDocument } from '@/types/knowledgeBase';

interface Props {
  documents: KnowledgeDocument[];
  loading: boolean;
  onDelete: (id: number) => void;
}

export const KbDocumentList: React.FC<Props> = ({ documents, loading, onDelete }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-[11px] py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando documentos...
      </div>
    );
  }

  if (documents.length === 0) {
    return <p className="text-[11px] text-slate-400 py-1.5">Sin documentos todavía.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 py-1.5 text-[11px]">
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-slate-700">{doc.filename}</span>
          <span className="text-slate-400 shrink-0">{doc.charCount.toLocaleString('es-AR')} car.</span>
          <button onClick={() => onDelete(doc.id)} className="p-0.5 rounded hover:bg-red-50 text-red-500 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default KbDocumentList;
