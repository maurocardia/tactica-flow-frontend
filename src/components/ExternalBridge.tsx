import { useEffect } from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { useAuth } from '@/state/AuthContext';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { useActiveChat } from '@/hooks/useActiveChat';
import { ApiService } from '@/services/api.service';
import { ModalId } from '@/config/modals';

const OPEN_MODAL_EVENT = 'tactica-flow:open-modal';
const TOGGLE_BOT_EVENT = 'tactica-flow:toggle-bot';
const STATUS_UPDATE_EVENT = 'tactica-flow:status-update';
const MODAL_STATE_EVENT = 'tactica-flow:modal-state';

// Puente entre los íconos inyectados directo en el header real de WhatsApp Web (fuera del
// Shadow DOM, ver content/waHeaderStatus.ts) y el estado/los modales de acá adentro. No renderiza
// nada — solo escucha/emite eventos en `window`, el único canal entre ambos árboles de DOM.
export const ExternalBridge: React.FC = () => {
  const { config, setConfig, scheduledMessages, sequences } = useAppState();
  const { activeModal, openModal } = useModal();
  const { user } = useAuth();
  const { status: waStatus } = useWhatsappStatus();
  const { activeContact } = useActiveChat();

  useEffect(() => {
    const onOpenModal = (e: Event) => {
      const detail = (e as CustomEvent<{ id: ModalId; payload?: unknown }>).detail;
      if (detail?.id) openModal(detail.id, detail.payload);
    };
    const onToggleBot = () => {
      setConfig((c) => {
        const botEnabled = !c.botEnabled;
        // Igual que el switch del panel: si hay sesión, esto también apaga/prende la sesión
        // real de Baileys en el backend, no solo el motor por DOM (ver ChatbotModule.tsx).
        if (user) {
          ApiService.setBotEnabled(botEnabled).catch((err) => {
            console.error('[ExternalBridge] No se pudo sincronizar el estado del bot con el backend:', err);
          });
        }
        return { ...c, botEnabled };
      });
    };

    window.addEventListener(OPEN_MODAL_EVENT, onOpenModal);
    window.addEventListener(TOGGLE_BOT_EVENT, onToggleBot);
    return () => {
      window.removeEventListener(OPEN_MODAL_EVENT, onOpenModal);
      window.removeEventListener(TOGGLE_BOT_EVENT, onToggleBot);
    };
  }, [openModal, setConfig, user]);

  // El host del Shadow DOM pone pointer-events: none cuando el panel está cerrado (para no
  // interceptar clics sobre WhatsApp) — sin este aviso, un modal abierto desde los íconos del
  // header real (que sigue vivo aunque el panel esté cerrado) quedaba visible pero sin poder
  // tocarse ni cerrarse hasta reabrir el panel. Ver content/index.tsx.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(MODAL_STATE_EVENT, { detail: { open: activeModal !== null } }));
  }, [activeModal]);

  useEffect(() => {
    const pendingCount = scheduledMessages.filter((m) => m.contactName === activeContact && m.active).length;
    const sequenceCount = sequences.filter((s) => s.contactName === activeContact && s.active).length;
    window.dispatchEvent(
      new CustomEvent(STATUS_UPDATE_EVENT, {
        detail: { pendingCount, sequenceCount, botEnabled: config.botEnabled, waStatus },
      })
    );
  }, [scheduledMessages, sequences, activeContact, config.botEnabled, waStatus]);

  return null;
};

export default ExternalBridge;
