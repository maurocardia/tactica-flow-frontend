import { useEffect } from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { useActiveChat } from '@/hooks/useActiveChat';
import { ModalId } from '@/config/modals';

const OPEN_MODAL_EVENT = 'tactica-flow:open-modal';
const TOGGLE_BOT_EVENT = 'tactica-flow:toggle-bot';
const STATUS_UPDATE_EVENT = 'tactica-flow:status-update';

// Puente entre los íconos inyectados directo en el header real de WhatsApp Web (fuera del
// Shadow DOM, ver content/waHeaderStatus.ts) y el estado/los modales de acá adentro. No renderiza
// nada — solo escucha/emite eventos en `window`, el único canal entre ambos árboles de DOM.
export const ExternalBridge: React.FC = () => {
  const { config, setConfig, scheduledMessages, sequences } = useAppState();
  const { openModal } = useModal();
  const { activeContact } = useActiveChat();

  useEffect(() => {
    const onOpenModal = (e: Event) => {
      const detail = (e as CustomEvent<{ id: ModalId; payload?: unknown }>).detail;
      if (detail?.id) openModal(detail.id, detail.payload);
    };
    const onToggleBot = () => setConfig((c) => ({ ...c, botEnabled: !c.botEnabled }));

    window.addEventListener(OPEN_MODAL_EVENT, onOpenModal);
    window.addEventListener(TOGGLE_BOT_EVENT, onToggleBot);
    return () => {
      window.removeEventListener(OPEN_MODAL_EVENT, onOpenModal);
      window.removeEventListener(TOGGLE_BOT_EVENT, onToggleBot);
    };
  }, [openModal, setConfig]);

  useEffect(() => {
    const pendingCount = scheduledMessages.filter((m) => m.contactName === activeContact && m.active).length;
    const sequenceCount = sequences.filter((s) => s.contactName === activeContact && s.active).length;
    window.dispatchEvent(
      new CustomEvent(STATUS_UPDATE_EVENT, { detail: { pendingCount, sequenceCount, botEnabled: config.botEnabled } })
    );
  }, [scheduledMessages, sequences, activeContact, config.botEnabled]);

  return null;
};

export default ExternalBridge;
