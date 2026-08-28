import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { useAuth } from '@/state/AuthContext';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { useActiveChat } from '@/hooks/useActiveChat';
import { ApiService } from '@/services/api.service';
import { DOMService } from '@/services/dom.service';
import { BotContact } from '@/types/botContact';
import { ModalId } from '@/config/modals';

const OPEN_MODAL_EVENT = 'tactica-flow:open-modal';
const TOGGLE_BOT_EVENT = 'tactica-flow:toggle-bot';
const STATUS_UPDATE_EVENT = 'tactica-flow:status-update';
const MODAL_STATE_EVENT = 'tactica-flow:modal-state';

const normalizeName = (s: string) => s.trim().toLowerCase();

// WhatsApp lanzó nombres de usuario públicos (@usuario) — para esos contactos el número real
// queda oculto a propósito en toda la interfaz, no es un dato que falte por un bug nuestro.
// Detectarlo evita abrir el panel de info para nada.
const isWhatsappUsername = (name: string) => name.trim().startsWith('@');

// Puente entre los íconos inyectados directo en el header real de WhatsApp Web (fuera del
// Shadow DOM, ver content/waHeaderStatus.ts) y el estado/los modales de acá adentro. No renderiza
// nada — solo escucha/emite eventos en `window`, el único canal entre ambos árboles de DOM.
export const ExternalBridge: React.FC = () => {
  const { config, setConfig, scheduledMessages, sequences } = useAppState();
  const { activeModal, openModal } = useModal();
  const { user } = useAuth();
  const { status: waStatus } = useWhatsappStatus();
  const { activeContact } = useActiveChat();

  // Lista de bot_contacts en memoria para poder resolver, sin más info que el nombre visible del
  // chat abierto (lo único que da el DOM), a qué fila de bot_contacts corresponde — así el ícono
  // del header puede togglear el switch de ESE contacto puntual en vez del switch global.
  const [botContacts, setBotContacts] = useState<BotContact[]>([]);
  const botContactsRef = useRef<BotContact[]>([]);
  botContactsRef.current = botContacts;

  useEffect(() => {
    if (!user) return;
    const load = () => ApiService.getBotContacts().then(setBotContacts).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const activeBotContact = useMemo(() => {
    if (activeContact === 'Sin chat seleccionado') return null;
    const target = normalizeName(activeContact);
    return botContacts.find((c) => normalizeName(c.name) === target) || null;
  }, [botContacts, activeContact]);

  useEffect(() => {
    const onOpenModal = (e: Event) => {
      const detail = (e as CustomEvent<{ id: ModalId; payload?: unknown }>).detail;
      if (detail?.id) openModal(detail.id, detail.payload);
    };
    // El ícono del bot en el header real de WhatsApp controla el switch DE ESTE CONTACTO puntual
    // (tabla bot_contacts). Casos, en orden:
    // 1. Si el chat abierto es un GRUPO, se identifica por su JID real (DOMService.getOpenGroupJid,
    //    lectura fresca del DOM en cada click) en vez de por nombre — confirmado a mano que dos
    //    grupos distintos pueden llamarse exactamente igual, así que matchear por nombre ahí
    //    togglearía el grupo equivocado sin ningún aviso.
    // 2. Si no es un grupo (o no se pudo leer su JID), se matchea por nombre como contacto
    //    individual — ya lo conocemos → togglea su switch tal cual.
    // 3. Hay un chat abierto pero todavía no está en bot_contacts (nunca escribió, o Baileys
    //    todavía no sincronizó su nombre) → estando DENTRO del chat, WhatsApp sí expone su número
    //    real en el DOM (ver DOMService.getChatPhone) — lo sacamos ahí mismo y lo damos de alta ya
    //    con el bot prendido (la intención de tocar el ícono es esa), en vez de perder el clic.
    // 4. No hay ningún chat abierto → no hay nada que resolver, cae al switch global como red de
    //    seguridad.
    const onToggleBot = async () => {
      const currentActiveContact = activeContact;
      const groupJid = DOMService.getOpenGroupJid();
      const contact = groupJid
        ? botContactsRef.current.find((c) => c.jid === groupJid)
        : botContactsRef.current.find((c) => activeBotContactMatches(c, currentActiveContact));
      if (contact) {
        const nextEnabled = !contact.botEnabled;
        setBotContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, botEnabled: nextEnabled } : c)));
        ApiService.setBotContactEnabled(contact.id, nextEnabled).catch((err) => {
          console.error('[ExternalBridge] No se pudo sincronizar el switch de este contacto con el backend:', err);
          setBotContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, botEnabled: contact.botEnabled } : c)));
        });
        return;
      }

      if (currentActiveContact !== 'Sin chat seleccionado' && !groupJid && !isWhatsappUsername(currentActiveContact)) {
        // Un contacto guardado con foto puede no mostrar el número en ningún lado del header (ej.
        // "Ángel Univer", confirmado a mano) — ahí hay que abrir "Información del perfil" para
        // verlo, y de paso rescatar el "~nombre" que la persona se puso a sí misma cuando el
        // título del chat es directamente el número (contacto sin nombre guardado).
        let phone = DOMService.getChatPhone(currentActiveContact);
        let nameToUse = currentActiveContact;
        // Para un contacto sin nombre guardado, WhatsApp muestra el número FORMATEADO como título
        // del chat — y ESE MISMO texto es justo lo que getChatPhone() encuentra en el header, así
        // que hay que entrar al panel también cuando el "nombre" que tenemos es, en los hechos, el
        // mismo número (no solo cuando getChatPhone() falla del todo).
        const nameLooksLikePhone =
          phone !== null && currentActiveContact.replace(/[^0-9]/g, '') === phone;
        if (!phone || nameLooksLikePhone) {
          const viaProfile = await DOMService.getChatPhoneViaProfile();
          if (!phone) phone = viaProfile.phone;
          if (viaProfile.selfSetName && nameLooksLikePhone) {
            nameToUse = viaProfile.selfSetName;
          }
        }
        if (phone) {
          try {
            const created = await ApiService.addBotContact(phone, nameToUse, true);
            setBotContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
          } catch (err) {
            console.error('[ExternalBridge] No se pudo dar de alta este contacto desde el header:', err);
          }
          return;
        }
        console.warn('[ExternalBridge] No se pudo obtener el número real de este chat, cae al switch global.');
      }

      setConfig((c) => {
        const botEnabled = !c.botEnabled;
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
  }, [openModal, setConfig, user, activeContact]);

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
    // El puntito del ícono del bot refleja si el bot LE VA A RESPONDER DE VERDAD a este chat
    // ahora mismo (mismos 3 modos que "Estado del bot" en ChatbotModule):
    // - "Ninguno" (config.botEnabled=false): siempre apagado, sea quien sea.
    // - "Todos" (botReplyToAll=true): siempre prendido, sea quien sea.
    // - "Contactos/Grupos": depende del switch de ESE contacto puntual — y si todavía no lo
    //   conocemos (nunca escribió, no está en bot_contacts), el valor real es "apagado" hasta que
    //   se active a mano, NUNCA el switch global — antes caía ahí por error y mostraba el
    //   puntito prendido para cualquier contacto sin sincronizar mientras el switch global
    //   estuviera en on, aunque ese contacto puntual no fuera a recibir respuesta.
    const botEnabled = !config.botEnabled
      ? false
      : config.botReplyToAll
        ? true
        : activeBotContact
          ? activeBotContact.botEnabled
          : false;
    window.dispatchEvent(
      new CustomEvent(STATUS_UPDATE_EVENT, {
        detail: { pendingCount, sequenceCount, botEnabled, waStatus },
      })
    );
  }, [scheduledMessages, sequences, activeContact, activeBotContact, config.botEnabled, config.botReplyToAll, waStatus]);

  return null;
};

function activeBotContactMatches(contact: BotContact, activeContact: string): boolean {
  if (activeContact === 'Sin chat seleccionado') return false;
  return normalizeName(contact.name) === normalizeName(activeContact);
}

export default ExternalBridge;
