// src/components/sidebar/flow/NodeConfigDrawer.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Upload,
  Link as LinkIcon,
  Loader2,
  UserCheck,
  Shuffle
} from 'lucide-react';
import { BotFlowNode, FlowNodeOption, NodeType } from '@/types/bot';
import { FlowMediaAsset } from '@/types/flowMedia';
import { Advisor } from '@/types/advisor';
import { ApiService } from '@/services/api.service';
import { PALETTE_BLOCKS } from './FlowPalette';

interface NodeConfigDrawerProps {
  node: BotFlowNode | null;
  allNodes: BotFlowNode[];
  onClose: () => void;
  onSave: (updatedNode: BotFlowNode) => void;
}

const MEDIA_TYPES = new Set<NodeType>(['SEND_IMAGE', 'SEND_VIDEO', 'SEND_AUDIO', 'SEND_DOCUMENT']);
const INTERACTIVE_TYPES = new Set<NodeType>(['OPTIONS_MENU', 'BUTTONS_REPLY', 'LIST_MESSAGE']);
const KEYWORD_TYPES = new Set<NodeType>([
  'TRIGGER', 'STATIC_REPLY', 'OPTIONS_MENU', 'SEND_IMAGE', 'SEND_VIDEO', 'SEND_AUDIO', 'SEND_DOCUMENT', 'BUTTONS_REPLY', 'LIST_MESSAGE'
]);

function mediaKindForType(t: NodeType): 'image' | 'video' | 'audio' | 'document' | null {
  switch (t) {
    case 'SEND_IMAGE': return 'image';
    case 'SEND_VIDEO': return 'video';
    case 'SEND_AUDIO': return 'audio';
    case 'SEND_DOCUMENT': return 'document';
    default: return null;
  }
}

function acceptForKind(kind: 'image' | 'video' | 'audio' | 'document'): string {
  switch (kind) {
    case 'image': return 'image/*';
    case 'video': return 'video/*';
    case 'audio': return 'audio/*';
    case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Máximos alineados con lo que WhatsApp permite mostrar de forma legible — más allá de esto, el
// texto numerado (ver flowEngine.service.ts, renderInteractiveAsText) se vuelve poco práctico.
const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;

export const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  node,
  allNodes,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<NodeType>('STATIC_REPLY');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [replyText, setReplyText] = useState('');
  const [options, setOptions] = useState<FlowNodeOption[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(2);

  // Media (SEND_IMAGE/SEND_VIDEO/SEND_AUDIO/SEND_DOCUMENT)
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>('url');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAssetId, setMediaAssetId] = useState<number | undefined>(undefined);
  const [mediaFileName, setMediaFileName] = useState<string | undefined>(undefined);
  const [mediaMimeType, setMediaMimeType] = useState<string | undefined>(undefined);
  const [mediaSizeBytes, setMediaSizeBytes] = useState<number | undefined>(undefined);
  const [asVoiceNote, setAsVoiceNote] = useState(false);
  const [gifPlayback, setGifPlayback] = useState(false);
  const [flowMediaAssets, setFlowMediaAssets] = useState<FlowMediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // LIST_MESSAGE
  const [listButtonText, setListButtonText] = useState('Ver opciones');
  const [footerText, setFooterText] = useState('');

  // Tiempo de espera / "sin respuesta" (OPTIONS_MENU / BUTTONS_REPLY / LIST_MESSAGE)
  const [waitTimeoutEnabled, setWaitTimeoutEnabled] = useState(false);
  const [waitTimeoutMinutesValue, setWaitTimeoutMinutesValue] = useState(5);

  // HANDOFF ("Contactar Asesor")
  const [advisorMode, setAdvisorMode] = useState<'auto' | 'fixed'>('auto');
  const [advisorId, setAdvisorId] = useState<number | null>(null);
  const [advisorNotifyTemplate, setAdvisorNotifyTemplate] = useState('');
  const [pauseMode, setPauseMode] = useState<'manual' | 'timed'>('manual');
  const [pauseMinutesValue, setPauseMinutesValue] = useState(120);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);

  useEffect(() => {
    if (node) {
      setName(node.data?.name || node.title || '');
      setType(node.type);
      setKeywords(node.data?.keywords ? [...node.data.keywords] : []);
      setReplyText(node.data?.replyText || '');
      setOptions(
        node.data?.options && node.data.options.length > 0
          ? node.data.options.map((o, idx) => ({ ...o, id: o.id || `opt_${Date.now()}_${idx + 1}` }))
          : node.type === 'OPTIONS_MENU' || node.type === 'BUTTONS_REPLY' || node.type === 'LIST_MESSAGE'
          ? [{ id: `opt_${Date.now()}_1`, label: '1. Opción A', keyword: '1', targetNodeId: null }]
          : []
      );
      setDelaySeconds(node.data?.delaySeconds || 2);

      const media = node.data?.media;
      setMediaSource(media?.source || 'url');
      setMediaUrl(media?.url || '');
      setMediaAssetId(media?.assetId);
      setMediaFileName(media?.fileName);
      setMediaMimeType(media?.mimeType);
      setMediaSizeBytes(media?.sizeBytes);
      setAsVoiceNote(!!node.data?.asVoiceNote);
      setGifPlayback(!!node.data?.gifPlayback);

      setListButtonText(node.data?.listButtonText || 'Ver opciones');
      setFooterText(node.data?.footerText || '');

      const waitMinutes = node.data?.waitTimeoutMinutes;
      setWaitTimeoutEnabled(typeof waitMinutes === 'number' && waitMinutes > 0);
      setWaitTimeoutMinutesValue(typeof waitMinutes === 'number' && waitMinutes > 0 ? waitMinutes : 5);

      setAdvisorMode(node.data?.advisorMode === 'fixed' ? 'fixed' : 'auto');
      setAdvisorId(node.data?.advisorId ?? null);
      setAdvisorNotifyTemplate(node.data?.advisorNotifyTemplate || '');
      const pauseMinutes = node.data?.pauseBotMinutes;
      if (typeof pauseMinutes === 'number' && pauseMinutes > 0) {
        setPauseMode('timed');
        setPauseMinutesValue(pauseMinutes);
      } else {
        setPauseMode('manual');
        setPauseMinutesValue(120);
      }
      setUploadError(null);
    }
  }, [node]);

  // Trae los adjuntos ya subidos de este tipo, para poder reusar uno en vez de subirlo de nuevo.
  useEffect(() => {
    const kind = mediaKindForType(type);
    if (!kind) return;
    ApiService.getFlowMediaAssets()
      .then((all) => setFlowMediaAssets(all.filter((a) => a.kind === kind)))
      .catch(() => {});
  }, [type]);

  // Trae los asesores para el selector de "asesor fijo" del bloque "Contactar Asesor".
  useEffect(() => {
    if (type !== 'HANDOFF') return;
    ApiService.getAdvisors().then(setAdvisors).catch(() => {});
  }, [type]);

  if (!node) return null;

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const optionsLimit = type === 'BUTTONS_REPLY' ? MAX_BUTTONS : type === 'LIST_MESSAGE' ? MAX_LIST_ROWS : Infinity;

  const handleAddOption = () => {
    if (options.length >= optionsLimit) return;
    const nextNum = options.length + 1;
    const newOption: FlowNodeOption = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: type === 'LIST_MESSAGE' ? `Opción ${nextNum}` : `${nextNum}. Opción ${nextNum}`,
      keyword: `${nextNum}`,
      targetNodeId: null
    };
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (index: number, field: keyof FlowNodeOption, value: any) => {
    setOptions(options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)));
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const insertVariable = (varName: string) => {
    setReplyText((prev) => `${prev} {${varName}}`);
  };

  const handleFileUpload = async (file: File | undefined) => {
    const kind = mediaKindForType(type);
    if (!kind || !file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const asset = await ApiService.uploadFlowMedia(file, kind);
      setMediaSource('upload');
      setMediaAssetId(asset.id);
      setMediaFileName(asset.fileName);
      setMediaMimeType(asset.mimeType);
      setMediaSizeBytes(asset.sizeBytes);
      setFlowMediaAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id)]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    const isInteractive = INTERACTIVE_TYPES.has(type);
    const mediaKind = mediaKindForType(type);

    const media =
      mediaKind == null
        ? undefined
        : mediaSource === 'upload'
        ? mediaAssetId
          ? { kind: mediaKind, source: 'upload' as const, assetId: mediaAssetId, fileName: mediaFileName, mimeType: mediaMimeType, sizeBytes: mediaSizeBytes }
          : undefined
        : mediaUrl.trim()
        ? { kind: mediaKind, source: 'url' as const, url: mediaUrl.trim() }
        : undefined;

    const updated: BotFlowNode = {
      ...node,
      type,
      title: name.trim() || node.title,
      data: {
        ...node.data,
        name: name.trim() || node.data?.name || node.title,
        keywords: keywords || [],
        replyText: replyText || '',
        options: isInteractive
          ? options.map((opt, i) => ({
              ...opt,
              id: opt.id || `opt_${Date.now()}_${i + 1}`,
              label: opt.label.trim() || `Opción ${i + 1}`,
              keyword: opt.keyword.trim() || `${i + 1}`,
              description: type === 'LIST_MESSAGE' ? opt.description?.trim() || undefined : undefined,
              sectionTitle: type === 'LIST_MESSAGE' ? opt.sectionTitle?.trim() || undefined : undefined
            }))
          : undefined,
        delaySeconds: type === 'DELAY' ? delaySeconds : undefined,
        media,
        asVoiceNote: type === 'SEND_AUDIO' ? asVoiceNote : undefined,
        gifPlayback: type === 'SEND_VIDEO' ? gifPlayback : undefined,
        listButtonText: type === 'LIST_MESSAGE' ? listButtonText.trim() || 'Ver opciones' : undefined,
        footerText: type === 'LIST_MESSAGE' ? footerText.trim() || undefined : undefined,
        waitTimeoutMinutes: isInteractive ? (waitTimeoutEnabled ? waitTimeoutMinutesValue : null) : undefined,
        advisorMode: type === 'HANDOFF' ? advisorMode : undefined,
        advisorId: type === 'HANDOFF' && advisorMode === 'fixed' ? advisorId : undefined,
        advisorNotifyTemplate: type === 'HANDOFF' ? advisorNotifyTemplate.trim() || undefined : undefined,
        pauseBotMinutes: type === 'HANDOFF' ? (pauseMode === 'manual' ? null : pauseMinutesValue) : undefined,
        isActive: true
      }
    };
    onSave(updated);
  };

  const isTrigger = type === 'TRIGGER';
  const mediaKind = mediaKindForType(type);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 shrink-0">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Configuración del Bloque
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ID: {node.id}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Formulario */}
      <form id="node-config-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* Nombre del bloque */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Nombre del bloque:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Saludo Inicial / Consulta Precios"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
          />
        </div>

        {/* Tipo de bloque (Selector) */}
        {!isTrigger && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tipo de acción:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE_BLOCKS.filter((b) => b.type !== 'TRIGGER').map((b) => {
                const Icon = b.icon;
                const isCurrent = type === b.type;
                return (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => setType(b.type)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[11px]">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Palabras Clave */}
        {(isTrigger || KEYWORD_TYPES.has(type)) && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Palabras clave activadoras (Disparador):
            </label>
            <div className="flex gap-1.5 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="Escribe palabra y presiona Enter o +"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 font-medium text-[11px]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(i)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && (
                <span className="text-slate-400 italic text-[11px]">
                  Sin palabras clave. Se activará cuando otro bloque apunte a él.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mensaje de Respuesta / Caption */}
        {type !== 'DELAY' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {mediaKind === 'audio'
                  ? 'Texto previo (se envía aparte, antes del audio):'
                  : mediaKind
                  ? 'Texto del mensaje (caption):'
                  : type === 'FINISH_FLOW'
                  ? 'Mensaje de cierre / despedida (opcional):'
                  : 'Texto del mensaje:'}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Variables:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('nombre')}
                  className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold hover:bg-red-100 cursor-pointer"
                >
                  {'{nombre}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('empresa')}
                  className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold hover:bg-red-100 cursor-pointer"
                >
                  {'{empresa}'}
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={
                type === 'FINISH_FLOW'
                  ? 'Ej: Gracias por comunicarte con nosotros. ¡Hasta pronto!'
                  : 'Escribe la respuesta que enviará el bot...'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-normal focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden resize-none"
            />
            {mediaKind === 'audio' && (
              <p className="text-[10.5px] text-slate-500 mt-1">
                WhatsApp no admite texto pegado a un audio — si escribís algo acá, se manda como mensaje aparte justo antes.
              </p>
            )}
          </div>
        )}

        {/* Adjunto multimedia (SEND_IMAGE / SEND_VIDEO / SEND_AUDIO / SEND_DOCUMENT) */}
        {mediaKind && (
          <div className="flex flex-col gap-2.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Adjunto ({mediaKind === 'image' ? 'imagen' : mediaKind === 'video' ? 'video' : mediaKind === 'audio' ? 'audio' : 'documento'}):
            </label>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMediaSource('url')}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mediaSource === 'url' ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <LinkIcon className="w-3 h-3" /> Por URL
              </button>
              <button
                type="button"
                onClick={() => setMediaSource('upload')}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mediaSource === 'upload' ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Upload className="w-3 h-3" /> Subir archivo
              </button>
            </div>

            {mediaSource === 'url' ? (
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
              />
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold cursor-pointer hover:border-[#9e1114] hover:text-[#9e1114] transition-colors">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Subiendo...' : 'Elegir archivo'}
                  <input
                    type="file"
                    accept={acceptForKind(mediaKind)}
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>

                {uploadError && <p className="text-[10.5px] text-red-600">{uploadError}</p>}

                {mediaAssetId && mediaFileName && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <span className="truncate">{mediaFileName}{mediaSizeBytes ? ` · ${formatBytes(mediaSizeBytes)}` : ''}</span>
                  </div>
                )}

                {flowMediaAssets.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">O reusar uno ya subido:</span>
                    <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                      {flowMediaAssets.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setMediaAssetId(a.id);
                            setMediaFileName(a.fileName);
                            setMediaMimeType(a.mimeType);
                            setMediaSizeBytes(a.sizeBytes);
                          }}
                          className={`text-left px-2 py-1 rounded-lg text-[10.5px] truncate transition-colors cursor-pointer ${
                            mediaAssetId === a.id
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {a.fileName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mediaKind === 'audio' && (
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={asVoiceNote} onChange={(e) => setAsVoiceNote(e.target.checked)} className="cursor-pointer" />
                Enviar como nota de voz
              </label>
            )}
            {mediaKind === 'video' && (
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={gifPlayback} onChange={(e) => setGifPlayback(e.target.checked)} className="cursor-pointer" />
                Enviar como GIF en loop
              </label>
            )}
          </div>
        )}

        {/* Opciones (OPTIONS_MENU / BUTTONS_REPLY / LIST_MESSAGE) */}
        {INTERACTIVE_TYPES.has(type) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {type === 'LIST_MESSAGE' ? 'Filas de la lista' : type === 'BUTTONS_REPLY' ? 'Respuestas rápidas' : 'Opciones del Menú'}
                {' '}({options.length}/{Number.isFinite(optionsLimit) ? optionsLimit : '∞'}):
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                disabled={options.length >= optionsLimit}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {type !== 'OPTIONS_MENU' && (
              <p className="text-[10.5px] text-slate-500 mb-2">
                WhatsApp no permite botones/listas táctiles reales acá — se muestran como texto numerado, igual que el Menú de Opciones.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div
                  key={opt.id || i}
                  className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(i, 'label', e.target.value)}
                      placeholder="Texto de la opción (ej: 1. Consultar Precios)"
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 shrink-0">Atajo / Tecla:</span>
                    <input
                      type="text"
                      value={opt.keyword}
                      onChange={(e) => handleUpdateOption(i, 'keyword', e.target.value)}
                      placeholder="ej: 1"
                      className="w-16 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold"
                    />
                  </div>

                  {type === 'LIST_MESSAGE' && (
                    <>
                      <input
                        type="text"
                        value={opt.description || ''}
                        onChange={(e) => handleUpdateOption(i, 'description', e.target.value)}
                        placeholder="Subtítulo de la fila (opcional)"
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200"
                      />
                      <input
                        type="text"
                        value={opt.sectionTitle || ''}
                        onChange={(e) => handleUpdateOption(i, 'sectionTitle', e.target.value)}
                        placeholder="Sección (agrupa filas seguidas con el mismo nombre)"
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            {type === 'LIST_MESSAGE' && (
              <div className="flex flex-col gap-2 mt-2.5">
                <input
                  type="text"
                  value={listButtonText}
                  onChange={(e) => setListButtonText(e.target.value)}
                  placeholder="Texto del botón (ej: Ver opciones)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Pie de página (opcional)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* Tiempo de espera / "sin respuesta" (Menú, Respuestas, Lista) */}
        {INTERACTIVE_TYPES.has(type) && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2">
            <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={waitTimeoutEnabled} onChange={(e) => setWaitTimeoutEnabled(e.target.checked)} className="cursor-pointer" />
              Tiempo de espera:
            </label>

            {waitTimeoutEnabled && (
              <>
                <p className="text-[10.5px] text-red-600 dark:text-red-400">
                  Al reiniciar el backend, esta configuración se pierde para las conversaciones que ya están esperando respuesta en este bloque.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={waitTimeoutMinutesValue}
                    onChange={(e) => setWaitTimeoutMinutesValue(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Minutos</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Si el cliente no responde a tiempo, el bot sigue solo por el puerto ámbar del bloque ("sin respuesta") — conectalo al bloque que quieras que se mande.
                </p>
              </>
            )}
          </div>
        )}

        {/* Delay en segundos */}
        {type === 'DELAY' && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tiempo de espera (segundos):
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Pausa la respuesta para simular que un operador está tipeando.
            </p>
          </div>
        )}

        {/* Contactar Asesor (HANDOFF) */}
        {type === 'HANDOFF' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                ¿A quién se deriva?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdvisorMode('auto')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    advisorMode === 'auto'
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px]">Automático (turnos)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisorMode('fixed')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    advisorMode === 'fixed'
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px]">Asesor fijo</span>
                </button>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-1">
                {advisorMode === 'auto'
                  ? 'Se elige al asesor activo con menos derivaciones recientes (equitativo).'
                  : 'Siempre se deriva al mismo asesor, sin importar la carga de los demás.'}
              </p>
            </div>

            {advisorMode === 'fixed' && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Asesor:
                </label>
                <select
                  value={advisorId ?? ''}
                  onChange={(e) => setAdvisorId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="">Elegí un asesor...</option>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.isActive}>
                      {a.name}{!a.isActive ? ' (inactivo)' : ''}
                    </option>
                  ))}
                </select>
                {advisors.length === 0 && (
                  <p className="text-[10.5px] text-amber-600 mt-1">
                    Todavía no hay asesores creados — gestionalos desde el botón "Asesores" del panel.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mensaje de notificación al asesor (opcional):
              </label>
              <div className="flex items-center gap-1 mb-1 flex-wrap">
                <span className="text-[10px] text-slate-400">Variables:</span>
                {['nombre', 'telefono', 'asesor', 'mensaje', 'fecha'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAdvisorNotifyTemplate((prev) => `${prev} {${v}}`)}
                    className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold hover:bg-rose-100 cursor-pointer"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={advisorNotifyTemplate}
                onChange={(e) => setAdvisorNotifyTemplate(e.target.value)}
                placeholder="Si lo dejás vacío, se usa una plantilla por defecto con estos mismos datos."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Pausar el bot para este contacto:
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="radio" checked={pauseMode === 'manual'} onChange={() => setPauseMode('manual')} className="cursor-pointer" />
                  Hasta reactivarlo a mano desde el panel
                </label>
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="radio" checked={pauseMode === 'timed'} onChange={() => setPauseMode('timed')} className="cursor-pointer" />
                  Por un tiempo determinado
                </label>
                {pauseMode === 'timed' && (
                  <div className="flex items-center gap-2 pl-6">
                    <input
                      type="number"
                      min={1}
                      value={pauseMinutesValue}
                      onChange={(e) => setPauseMinutesValue(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                    />
                    <span className="text-[11px] text-slate-500">minutos</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="node-config-form"
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Guardar Cambios
        </button>
      </div>
    </div>
  );
};
