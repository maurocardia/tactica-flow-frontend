import React, { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { KnowledgeDocument } from '@/types/knowledgeBase';

export const KbUploader: React.FC<{ knowledgeBaseId: number; onUploaded: (doc: KnowledgeDocument) => void }> = ({
  knowledgeBaseId,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const doc = await ApiService.uploadKbDocument(knowledgeBaseId, file);
      onUploaded(doc);
    } catch (err: any) {
      console.error('[KbUploader] Error al subir documento:', err);
      setError(err?.message || 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-600 text-[11px] font-semibold py-1.5 rounded-lg"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Subiendo...' : 'Subir documento (PDF, Word, TXT, MD)'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && <p className="text-[10.5px] text-red-600">{error}</p>}
    </div>
  );
};

export default KbUploader;
