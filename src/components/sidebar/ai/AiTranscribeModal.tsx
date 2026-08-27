import React, { useEffect, useState } from 'react';
import { Mic, Loader2, Copy, Check, Volume2, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';

interface AiTranscribeModalProps {
  onClose: () => void;
  contactName: string;
}

interface AudioItem {
  id: string;
  sender: 'me' | 'them';
  duration: string;
  src: string | null;
  status: 'idle' | 'transcribing' | 'done' | 'error';
  transcription?: string;
  selected: boolean;
}

export const AiTranscribeModal: React.FC<AiTranscribeModalProps> = ({ onClose, contactName }) => {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loadingDetection, setLoadingDetection] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isTranscribingAll, setIsTranscribingAll] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadAndSyncAudios = async () => {
    setIsSyncing(true);
    setLoadingDetection(true);

    const title = DOMService.getChatTitle() || contactName;
    const visibleMessages = DOMService.getVisibleMessages('all');

    // Sincronización automática de pantalla a base de datos al abrir / refrescar
    try {
      await ApiService.syncConversationMessages({
        phone: title,
        name: title,
        messages: visibleMessages.map((m) => ({
          sender: m.sender === 'them' ? 'customer' : 'agent',
          text: m.text,
          createdAt:
            m.dateCategory === 'past'
              ? new Date(Date.now() - 3 * 86400 * 1000).toISOString()
              : new Date().toISOString()
        })),
        mode: 'replace'
      });
    } catch (err) {
      console.warn('[AiTranscribeModal] Auto-sync falló:', err);
    }

    const detected = DOMService.getVisibleAudios();
    const detectedItems: AudioItem[] = detected.map((a) => ({
      ...a,
      status: 'idle',
      selected: true
    }));

    // Cargar también audios/transcripciones persistidas por Baileys desde PostgreSQL
    try {
      const conversations = await ApiService.getConversations();
      const matchConv = conversations.find((c) => c.name === title || c.phone === title);
      if (matchConv) {
        const msgs = await ApiService.getMessages(matchConv.id);
        for (const m of msgs) {
          if (m.text.includes('[🎙️ Audio]') || m.text.includes('[🎙️ Nota de voz]')) {
            const match = m.text.match(/\[🎙️ Audio\]:\s*"?(.*?)"?$/);
            const transcriptionText = match ? match[1] : '';
            const exists = detectedItems.some((d) => d.id === `db_audio_${m.id}`);
            if (!exists) {
              detectedItems.unshift({
                id: `db_audio_${m.id}`,
                sender: m.sender === 'customer' ? 'them' : 'me',
                duration: '0:30',
                src: null,
                status: transcriptionText ? 'done' : 'idle',
                transcription: transcriptionText || undefined,
                selected: true
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AiTranscribeModal] Error leyendo audios de la DB:', err);
    }

    setAudios(detectedItems);
    setLoadingDetection(false);
    setIsSyncing(false);
  };

  useEffect(() => {
    loadAndSyncAudios();
  }, [contactName]);

  const handleTranscribeItem = async (index: number) => {
    const item = audios[index];
    if (!item) return;

    setAudios((prev) =>
      prev.map((a, i) => (i === index ? { ...a, status: 'transcribing' } : a))
    );

    try {
      let blobSrc = item.src;
      if (!blobSrc || !blobSrc.startsWith('blob:')) {
        // Buscar el elemento en el DOM en tiempo real
        const row = document.querySelector(`[data-id="${item.id}"]`) || document.querySelector(`#main audio`);
        const audioEl = row ? (row.tagName === 'AUDIO' ? (row as HTMLAudioElement) : row.querySelector('audio')) : null;
        if (audioEl && (audioEl.currentSrc || audioEl.src)) {
          blobSrc = audioEl.currentSrc || audioEl.src;
        } else {
          // Intentar hacer clic en el botón de reproducción para forzar la carga del blob de audio
          const playBtn = row?.querySelector(
            '[data-icon*="ptt"], [data-icon*="play"], [data-icon*="audio"], button[aria-label*="play" i], button[aria-label*="reproducir" i], button[aria-label*="nota de voz" i], [data-testid*="audio"], [data-testid*="ptt"]'
          ) as HTMLElement | null;
          if (playBtn) {
            playBtn.click();
            await new Promise((r) => setTimeout(r, 900));
            // Buscar pausa después de reproducir para detenerlo
            const pauseBtn = row?.querySelector(
              '[data-icon*="ptt-pause"], [data-icon*="audio-pause"], [data-icon*="pause"], button[aria-label*="pausar" i], button[aria-label*="pause" i]'
            ) as HTMLElement | null;
            if (pauseBtn) pauseBtn.click();
            const reAudio = row?.querySelector('audio') as HTMLAudioElement | null;
            if (reAudio && (reAudio.currentSrc || reAudio.src)) {
              blobSrc = reAudio.currentSrc || reAudio.src;
            }
          }
        }
      }

      if (!blobSrc || !blobSrc.startsWith('blob:')) {
        throw new Error('El audio aún no se ha descargado en WhatsApp. Dale play un segundo en el chat para que cargue.');
      }

      const base64 = await DOMService.convertBlobUrlToBase64(blobSrc);
      const res = await ApiService.transcribeAudio(base64);

      setAudios((prev) =>
        prev.map((a, i) =>
          i === index
            ? { ...a, status: 'done', transcription: res.transcription || '(Audio vacío o sin voz inteligible)' }
            : a
        )
      );
    } catch (err: any) {
      console.error('[AiTranscribeModal] Error al transcribir audio:', err);
      setAudios((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                status: 'error',
                transcription: err.message || 'No se pudo procesar el audio. Verificá la conexión.'
              }
            : a
        )
      );
    }
  };

  const handleTranscribeAllSelected = async () => {
    setIsTranscribingAll(true);
    for (let i = 0; i < audios.length; i++) {
      if (audios[i].selected && audios[i].status !== 'done') {
        await handleTranscribeItem(i);
      }
    }
    setIsTranscribingAll(false);
  };

  const handleCopyAll = () => {
    const texts = audios
      .filter((a) => a.status === 'done' && a.transcription)
      .map(
        (a) =>
          `[Audio ${a.sender === 'them' ? 'Cliente' : 'Asesor'} - ${a.duration}]:\n"${a.transcription}"`
      )
      .join('\n\n');

    if (!texts) return;
    navigator.clipboard.writeText(texts);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const texts = audios
      .filter((a) => a.status === 'done' && a.transcription)
      .map(
        (a) =>
          `[Audio ${a.sender === 'them' ? 'Cliente' : 'Asesor'} - ${a.duration}]:\n"${a.transcription}"`
      )
      .join('\n\n');

    const contenido = `Transcripción de audios de WhatsApp con ${contactName}\n${new Date().toLocaleString('es-AR')}\n\n${texts}`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcripciones-${contactName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const doneCount = audios.filter((a) => a.status === 'done').length;

  return (
    <Modal
      title="Transcribir notas de voz"
      onClose={onClose}
      headerColor="bg-purple-600"
      maxWidth="max-w-[480px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={loadAndSyncAudios}
            disabled={loadingDetection || isSyncing || isTranscribingAll}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-950/60 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Sincroniza y busca nuevas notas de voz en el chat"
          >
            <Loader2 className={`w-3.5 h-3.5 ${loadingDetection || isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Actualizar Audios'}
          </button>

          <div className="flex items-center gap-2">
            {doneCount > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Descargar .txt
              </button>
            )}
            {doneCount > 0 && (
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs px-3 py-2 rounded-lg border border-purple-200 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar todo'}
              </button>
            )}
            <button
              onClick={handleTranscribeAllSelected}
              disabled={isTranscribingAll || audios.length === 0}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer shadow-xs"
            >
              {isTranscribingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
              {doneCount > 0 ? 'Transcribir restantes' : 'Transcribir seleccionados'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-xs">
        <p className="text-slate-500 bg-slate-50 rounded-lg p-2.5">
          Detecta notas de voz del chat con <strong className="text-slate-700">{contactName}</strong> y las transcribe usando Inteligencia Artificial.
        </p>

        {loadingDetection ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando notas de voz en la conversación...
          </div>
        ) : audios.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            No se encontraron notas de voz en los mensajes visibles de este chat.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-0.5">
            {audios.map((audio, index) => (
              <div
                key={audio.id}
                className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={audio.selected}
                      onChange={(e) =>
                        setAudios((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, selected: e.target.checked } : a
                          )
                        )
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                        <Volume2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800">
                        Audio ({audio.sender === 'them' ? 'Cliente' : 'Asesor'})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ⏱ {audio.duration}
                      </span>
                    </div>
                  </div>

                  <div>
                    {audio.status === 'idle' && (
                      <button
                        type="button"
                        onClick={() => handleTranscribeItem(index)}
                        className="text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Transcribir
                      </button>
                    )}
                    {audio.status === 'transcribing' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        <Loader2 className="w-3 h-3 animate-spin" /> Procesando...
                      </span>
                    )}
                    {audio.status === 'done' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3" /> Transcrito
                      </span>
                    )}
                    {audio.status === 'error' && (
                      <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                        Error
                      </span>
                    )}
                  </div>
                </div>

                {audio.transcription && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-700 leading-relaxed text-[11.5px] italic">
                    "{audio.transcription}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AiTranscribeModal;
