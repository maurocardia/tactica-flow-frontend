import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, Plus, Users, ChevronLeft, ChevronRight, RefreshCw, HelpCircle, X, ChevronDown, Upload, Download, CheckCircle2, ShieldBan, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { fieldInputClass } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { ApiService } from '@/services/api.service';
import { DOMService } from '@/services/dom.service';
import { BotContact, BulkImportResult } from '@/types/botContact';
import { COUNTRY_CODES } from '@/config/countryCodes';
import { BulkImportPreview } from './chatbot/BulkImportPreview';

const PAGE_SIZE = 5;

// La sincronización real (relee grupos/contactos que Baileys ya sabe) solo tiene sentido hacerla
// una vez por sesión del panel, no cada vez que se reabre el modal — así que el flag vive a nivel
// de módulo (se resetea solo si se recarga la extensión/la pestaña). Las aperturas siguientes solo
// piden la lista tal cual está en bot_contacts, que igual se mantiene al día sola con la actividad
// real (mensajes, nombres que Baileys va empujando).
let hasSyncedContactsThisSession = false;

const onlyDigits = (s: string) => s.replace(/[^0-9]/g, '');
const phoneOf = (jid: string) => jid.split('@')[0];

// WhatsApp lanzó nombres de usuario públicos (@usuario) — para esos contactos, el número real
// queda oculto a propósito en TODA la interfaz (header, panel de info, todo), no es un dato que
// falte por un bug nuestro. Detectarlo de entrada evita perder tiempo abriendo el chat/panel para
// nada, y permite dar un mensaje honesto en vez de "no se pudo leer el número".
const isWhatsappUsername = (name: string) => name.trim().startsWith('@');

// Avatar de iniciales en vez de foto real: la foto de perfil solo se puede conseguir de forma
// confiable vía la API de Baileys del lado del backend (con caché), no del DOM de WhatsApp Web
// (que la recicla/no carga si no está a la vista, igual que pasaba con los nombres) — se dejó
// afuera a propósito para no repetir esa misma fragilidad.
const AVATAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
const avatarColorFor = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// Fila para pintar en la lista: une los contactos/grupos reales (bot_contacts) con los nombres
// leídos de la lista de chats de WhatsApp Web que el backend todavía no pudo resolver a un JID
// real (ver syncRecentFromDom). Estos últimos son "pendientes": no existen en bot_contacts todavía,
// y se resuelven recién cuando el usuario interactúa con esa fila (foto o switch) — ver
// resolvePending.
interface DisplayRow {
  key: string;
  name: string;
  isGroup: boolean;
  botEnabled: boolean;
  subtitle: string;
  pending: boolean;
  contact?: BotContact;
}

// Lista de "contactos administrables" para el switch de bot por contacto, armada a partir de la
// tabla propia `bot_contacts` (espejo del backend, separado a propósito de `conversations`/
// `messages` — ver botContact.service.ts: nunca borra ni toca el historial real de chats, solo
// refleja altas/bajas/cambios de la lista real de WhatsApp), más los pendientes de la lista de
// chats que todavía no tienen JID confirmado.
export const ContactBotSwitchesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [contacts, setContacts] = useState<BotContact[]>([]);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [addPhone, setAddPhone] = useState('');
  const [addCountryCode, setAddCountryCode] = useState(COUNTRY_CODES[0].code);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'contacts' | 'groups' | 'blacklist'>('contacts');

  // Alta a la blacklist — mismo patrón de número+país que el alta normal de arriba, pero más
  // simple (no abre el chat en WhatsApp a buscar el nombre real, no hace falta para bloquear).
  const [blacklistPhone, setBlacklistPhone] = useState('');
  const [blacklistCountryCode, setBlacklistCountryCode] = useState(COUNTRY_CODES[0].code);
  const [blacklistCountryMenuOpen, setBlacklistCountryMenuOpen] = useState(false);
  const blacklistCountryMenuRef = useRef<HTMLDivElement>(null);
  const [blacklisting, setBlacklisting] = useState(false);

  // Importación masiva desde CSV/Excel (ver BulkImportPreview.tsx) — mientras hay un archivo
  // elegido, el cuerpo del modal muestra la previsualización en vez de la lista normal.
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const escapeCsvField = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

  // Exporta la lista completa de la pestaña actual (no solo la página/búsqueda visible) — mismas
  // columnas que la plantilla de importación (telefono;nombre;activo), así el archivo exportado
  // sirve directo como plantilla para reimportar en otra cuenta.
  const handleExport = () => {
    const rows = tabList.filter((r) => !r.pending && r.contact);
    const header = 'telefono;nombre;activo\n';
    const lines = rows.map((r) => `${phoneOf(r.contact!.jid)};${escapeCsvField(r.name)};${r.botEnabled ? 'si' : 'no'}`);
    const csv = header + lines.join('\n') + (lines.length ? '\n' : '');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = tab === 'contacts' ? 'contactos' : tab === 'groups' ? 'grupos' : 'blacklist';
    a.download = `${label}-tactica-flow.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    // Punto y coma en vez de coma: es el separador que usa Excel por default en configuración
    // regional en español (la coma la reserva como separador decimal) — con coma, Excel abría el
    // CSV entero como una sola columna en vez de 3. Papa.parse ya auto-detecta el delimitador al
    // importar, así que no hace falta tocar nada del lado del parseo.
    const csv = 'telefono;nombre;activo\n573001234567;Juan Pérez;si\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-contactos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImported = async (result: BulkImportResult) => {
    setImportFile(null);
    setImportResult(result);
    await loadPlainList();
  };

  const loadPlainList = () =>
    ApiService.getBotContacts()
      .then(setContacts)
      .catch((err) => {
        console.error('[ContactBotSwitchesModal] No se pudieron cargar los contactos:', err);
        setError('No se pudieron cargar los contactos.');
      });

  // Trae los últimos ~20 contactos individuales YA renderizados en la lista de chats de WhatsApp
  // Web (sin scrollear, ver DOMService.getRecentIndividualContacts) y le pregunta al backend si
  // puede resolver su JID real sin llamar a WhatsApp (nombres que Baileys ya conoce, o
  // `conversations`). Los que resuelve quedan sembrados solos en bot_contacts; los que no, quedan
  // como "pendientes" — se muestran igual en la lista, y se resuelven recién cuando el usuario
  // interactúa con esa fila puntual (ver resolvePending).
  const syncRecentFromDom = async (currentList: BotContact[]) => {
    try {
      const recentNames = DOMService.getRecentIndividualContacts(20);
      const known = new Set(currentList.filter((c) => !c.isGroup).map((c) => c.name.trim().toLowerCase()));
      const toResolve = recentNames.filter((n) => !known.has(n.trim().toLowerCase()));
      if (toResolve.length === 0) return;

      const resolved = await ApiService.resolveBotContactsByName(toResolve);
      const stillPending = resolved.filter((r) => !r.jid).map((r) => r.name);
      setPendingNames((prev) => Array.from(new Set([...prev, ...stillPending])));
      if (resolved.some((r) => r.jid)) {
        await loadPlainList();
      }
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudieron resolver los contactos recientes del DOM:', err);
    }
  };

  // Botón "Sincronizar": a diferencia de la sincronización automática de la primera apertura (ver
  // el useEffect de abajo), esta la puede disparar el usuario cuando quiera — por ejemplo después
  // de agregar un contacto nuevo a la agenda o crear un grupo, sin tener que esperar a que le
  // escriban para que aparezca en la lista.
  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const list = await ApiService.syncBotContacts();
      hasSyncedContactsThisSession = true;
      setContacts(list);
      await syncRecentFromDom(list);
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo sincronizar:', err);
      setError('No se pudo sincronizar. Verificá que WhatsApp esté conectado y probá de nuevo.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const load = hasSyncedContactsThisSession
      ? ApiService.getBotContacts()
      : ApiService.syncBotContacts()
          .then((list) => {
            hasSyncedContactsThisSession = true;
            return list;
          })
          .catch((err) => {
            // Si la sincronización falla (ej. WhatsApp desconectado en este momento), no dejamos
            // el flag en true — así el próximo intento vuelve a sincronizar en vez de quedar a
            // medias — y de paso se muestra la lista tal cual está en bot_contacts.
            console.error('[ContactBotSwitchesModal] No se pudo sincronizar, muestro la lista tal cual:', err);
            return ApiService.getBotContacts();
          });

    load
      .then(async (list) => {
        setContacts(list);
        // Completa con lo ya renderizado en la lista de chats para asegurar al menos algunos
        // contactos individuales recientes, aunque `conversations`/Baileys todavía no los tenga.
        await syncRecentFromDom(list);
      })
      .catch((err) => {
        console.error('[ContactBotSwitchesModal] No se pudieron cargar los contactos:', err);
        setError('No se pudieron cargar los contactos.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Si getChatPhone() (rápido, lee el header) no encuentra nada, recurre al panel de "Información
  // del perfil" — que de paso puede traer el nombre real: el "~nombre" que la persona se puso a sí
  // misma, útil cuando el título del chat es directamente el número (contacto sin nombre guardado —
  // confirmado a mano: "+57 316 6140287" con "~samira" debajo, en el panel).
  //
  // OJO: para un contacto sin nombre guardado, WhatsApp muestra el número FORMATEADO como título
  // del chat — y ESE MISMO texto es justo lo que getChatPhone() encuentra en el header (es rápido
  // porque no necesita abrir nada). Si solo entráramos al panel cuando getChatPhone() falla, nunca
  // llegaríamos a buscar el "~nombre" en estos casos (el bug real detrás de contactos guardados con
  // el número pelado como "nombre"): hay que entrar al panel también cuando el nombre que tenemos
  // es, en los hechos, el mismo número.
  const resolvePhoneAndName = async (fallbackName: string): Promise<{ phone: string | null; name: string }> => {
    let phone = DOMService.getChatPhone(fallbackName);
    let name = fallbackName;
    const nameLooksLikePhone = phone !== null && onlyDigits(name).length > 0 && onlyDigits(name) === phone;

    if (!phone || nameLooksLikePhone) {
      const viaProfile = await DOMService.getChatPhoneViaProfile();
      if (!phone) phone = viaProfile.phone;
      if (viaProfile.selfSetName && (nameLooksLikePhone || !name)) {
        name = viaProfile.selfSetName;
      }
    }
    return { phone, name };
  };

  // Resuelve una fila PENDIENTE: busca ese nombre en WhatsApp, abre el chat y, ya adentro, lee su
  // número real del DOM (WhatsApp solo lo expone dentro del chat abierto, no en la lista) — misma
  // técnica que "Agregar por nombre". Se dispara al tocar la foto (abrir) o el switch (activar/
  // desactivar) de una fila pendiente; en ambos casos termina dando de alta el contacto real con
  // el switch en el valor que corresponda.
  const resolvePending = async (row: DisplayRow, desiredEnabled: boolean) => {
    setBusyKey(row.key);
    setError(null);
    try {
      if (isWhatsappUsername(row.name)) {
        throw new Error(
          `"${row.name}" usa un nombre de usuario (@) de WhatsApp — el número real queda oculto en toda la interfaz. Se agregará solo en cuanto te escriba.`
        );
      }
      const opened = await DOMService.openChatByQuery(row.name);
      if (!opened) throw new Error(`No se encontró "${row.name}" en WhatsApp.`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const realName = DOMService.getChatTitle() || row.name;
      const { phone, name: resolvedName } = await resolvePhoneAndName(realName);
      if (!phone) throw new Error(`Se abrió el chat de "${row.name}" pero no se pudo leer su número real.`);
      const created = await ApiService.addBotContact(phone, resolvedName, desiredEnabled);
      setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setPendingNames((prev) => prev.filter((n) => n !== row.name));
      await DOMService.returnToHome();
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo confirmar el contacto pendiente:', err);
      setError(err instanceof Error ? err.message : `No se pudo confirmar "${row.name}".`);
    } finally {
      setBusyKey(null);
    }
  };

  // Al tocar la foto de un contacto YA confirmado: salta a ese chat en WhatsApp Web (por nombre
  // para grupos, por número para contactos individuales).
  const openInWhatsapp = async (contact: BotContact) => {
    setBusyKey(`real:${contact.id}`);
    try {
      const query = contact.isGroup ? contact.name : phoneOf(contact.jid);
      await DOMService.openChatByQuery(query);
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo abrir el chat:', err);
    } finally {
      setBusyKey(null);
    }
  };

  // "Recargar" un contacto puntual: por si quedó mal agregado (ej. con un @lid viejo en vez del
  // número real, como pasó con algunos contactos fragmentados de sesiones pasadas) — vuelve a
  // buscarlo por NOMBRE (no por el jid actual, que puede ser justamente el dato roto), abre el
  // chat, relee el número real, y corrige esa misma fila en vez de crear una nueva.
  const refreshContact = async (contact: BotContact) => {
    const key = `real:${contact.id}`;
    setBusyKey(key);
    setError(null);
    try {
      if (isWhatsappUsername(contact.name)) {
        throw new Error(`"${contact.name}" usa un nombre de usuario (@) de WhatsApp — no se puede releer su número.`);
      }
      const opened = await DOMService.openChatByQuery(contact.name);
      if (!opened) throw new Error(`No se encontró "${contact.name}" en WhatsApp.`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const realName = DOMService.getChatTitle() || contact.name;
      const { phone, name: resolvedName } = await resolvePhoneAndName(realName);
      if (!phone) throw new Error(`Se abrió el chat de "${contact.name}" pero no se pudo releer su número real.`);
      const updated = await ApiService.refreshBotContactIdentity(contact.id, phone, resolvedName);
      setContacts((prev) => [updated, ...prev.filter((c) => c.id !== contact.id && c.id !== updated.id)]);
      await DOMService.returnToHome();
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo recargar el contacto:', err);
      setError(err instanceof Error ? err.message : `No se pudo recargar "${contact.name}".`);
    } finally {
      setBusyKey(null);
    }
  };

  const toggleRow = async (contact: BotContact, enabled: boolean) => {
    setSavingKey(`real:${contact.id}`);
    try {
      const updated = await ApiService.setBotContactEnabled(contact.id, enabled);
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)));
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo actualizar el switch:', err);
      setError('No se pudo actualizar ese contacto. Probá de nuevo.');
    } finally {
      setSavingKey(null);
    }
  };

  // Botón "X": borra un contacto/grupo real de la lista, o simplemente descarta una fila
  // pendiente (esas ni siquiera existen en bot_contacts todavía, no hace falta llamar al backend).
  const removeRow = async (row: DisplayRow) => {
    if (row.pending) {
      setPendingNames((prev) => prev.filter((n) => n !== row.name));
      return;
    }
    const contact = row.contact!;
    setBusyKey(row.key);
    setError(null);
    try {
      await ApiService.deleteBotContact(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo borrar el contacto:', err);
      setError(`No se pudo borrar "${row.name}". Probá de nuevo.`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAvatarClick = (row: DisplayRow) => {
    if (row.pending) return resolvePending(row, false);
    return openInWhatsapp(row.contact!);
  };

  const handleToggle = (row: DisplayRow, enabled: boolean) => {
    if (row.pending) return resolvePending(row, enabled);
    return toggleRow(row.contact!, enabled);
  };

  // Acepta un número directo (ej. 5491123456789) o el NOMBRE del contacto tal cual aparece en
  // WhatsApp — si no es solo dígitos, lo tratamos como nombre: abrimos ese chat de verdad (misma
  // técnica que el botón de la foto) y, estando ya adentro, WhatsApp expone el número real en el
  // DOM (DOMService.getChatPhone) — así se da de alta con el JID correcto en vez de inventar uno,
  // y sin tener que saber el número de memoria.
  const handleAddContact = async () => {
    const raw = addPhone.trim();
    if (!raw) return;
    setAdding(true);
    setError(null);
    try {
      const rawDigits = onlyDigits(raw);
      // Un número "local" (sin "+") se completa con el código de país elegido en el desplegable —
      // si ya viene con "+", se respeta tal cual (asumimos que el usuario ya escribió el número
      // internacional completo).
      const isPhoneInput = rawDigits.length >= 6 && rawDigits.length === raw.replace(/[\s()+-]/g, '').length;
      const digits = raw.trim().startsWith('+') ? rawDigits : `${addCountryCode}${rawDigits}`;

      if (isPhoneInput) {
        // También abrimos el chat para rescatar el nombre real (o el "~nombre" que la persona se
        // puso a sí misma) en vez de guardar el número pelado como nombre — best-effort: si no se
        // encuentra el chat, igual se da de alta el número tal cual.
        let name: string | undefined;
        const opened = await DOMService.openChatByQuery(digits);
        if (opened) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const title = DOMService.getChatTitle();
          if (title && onlyDigits(title) !== digits) {
            name = title;
          } else {
            const viaProfile = await DOMService.getChatPhoneViaProfile();
            if (viaProfile.selfSetName) name = viaProfile.selfSetName;
          }
          await DOMService.returnToHome();
        }
        const created = await ApiService.addBotContact(digits, name, false);
        setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      } else {
        if (isWhatsappUsername(raw)) {
          throw new Error(
            `"${raw}" usa un nombre de usuario (@) de WhatsApp — el número real queda oculto en toda la interfaz. Se agregará solo en cuanto te escriba.`
          );
        }
        const opened = await DOMService.openChatByQuery(raw);
        if (!opened) throw new Error('No se encontró ese contacto en WhatsApp.');
        await new Promise((resolve) => setTimeout(resolve, 600));
        const realName = DOMService.getChatTitle() || raw;
        const { phone, name: resolvedName } = await resolvePhoneAndName(realName);
        if (!phone) throw new Error('Se abrió el chat pero no se pudo leer su número real.');
        const created = await ApiService.addBotContact(phone, resolvedName, false);
        setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        await DOMService.returnToHome();
      }
      setAddPhone('');
      setPendingNames((prev) => prev.filter((n) => n.trim().toLowerCase() !== raw.trim().toLowerCase()));
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo agregar el contacto:', err);
      setError(err instanceof Error ? err.message : 'No se pudo agregar ese contacto. Probá de nuevo.');
    } finally {
      setAdding(false);
    }
  };

  // Bloquea un número directamente (no hace falta que ya le haya escrito al bot ni abrir el chat
  // en WhatsApp — bloquear no necesita confirmar el nombre real, a diferencia del alta normal).
  const handleAddToBlacklist = async () => {
    const rawDigits = onlyDigits(blacklistPhone);
    if (!rawDigits) return;
    setBlacklisting(true);
    setError(null);
    try {
      const digits = blacklistPhone.trim().startsWith('+') ? rawDigits : `${blacklistCountryCode}${rawDigits}`;
      const created = await ApiService.addToBlacklist(digits, undefined);
      setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setBlacklistPhone('');
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo bloquear el número:', err);
      setError(err instanceof Error ? err.message : 'No se pudo bloquear ese número. Probá de nuevo.');
    } finally {
      setBlacklisting(false);
    }
  };

  // El bloque "Contactar Asesor" del editor de flujos pausa el bot para este contacto puntual
  // (ver handoffPausedUntil) — este botón lo reactiva a mano antes de que venza la pausa.
  const isHandoffPaused = (contact?: BotContact) =>
    !!contact?.handoffPausedUntil && new Date(contact.handoffPausedUntil) > new Date();

  const handleResumeBot = async (contact: BotContact) => {
    setBusyKey(`real:${contact.id}`);
    setError(null);
    try {
      const updated = await ApiService.resumeBotForContact(contact.id);
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)));
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo reactivar el bot:', err);
      setError(`No se pudo reactivar el bot para "${contact.name}". Probá de nuevo.`);
    } finally {
      setBusyKey(null);
    }
  };

  // Sacar de la blacklist NO borra la fila — el contacto simplemente vuelve a un estado neutral
  // (bot apagado, visible de nuevo en la pestaña Contactos) en vez de perder su historial/nombre.
  const handleUnblock = async (contact: BotContact) => {
    setBusyKey(`real:${contact.id}`);
    setError(null);
    try {
      const updated = await ApiService.setBotContactBlacklisted(contact.id, false);
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)));
    } catch (err) {
      console.error('[ContactBotSwitchesModal] No se pudo desbloquear el contacto:', err);
      setError(`No se pudo desbloquear "${contact.name}". Probá de nuevo.`);
    } finally {
      setBusyKey(null);
    }
  };

  const contactRows = useMemo<DisplayRow[]>(() => {
    const real: DisplayRow[] = contacts
      .filter((c) => !c.isGroup && !c.isBlacklisted)
      .map((c) => ({
        key: `real:${c.id}`,
        name: c.name,
        isGroup: false,
        botEnabled: c.botEnabled,
        subtitle: /^\d+$/.test(phoneOf(c.jid)) ? `+${phoneOf(c.jid)}` : phoneOf(c.jid),
        pending: false,
        contact: c,
      }));
    const pending: DisplayRow[] = pendingNames.map((name) => ({
      key: `pending:${name}`,
      name,
      isGroup: false,
      botEnabled: false,
      subtitle: 'Pendiente — tocá para buscarlo en WhatsApp',
      pending: true,
    }));
    return [...real, ...pending];
  }, [contacts, pendingNames]);

  const groupRows = useMemo<DisplayRow[]>(
    () =>
      contacts
        .filter((c) => c.isGroup && !c.isBlacklisted)
        .map((c) => ({
          key: `real:${c.id}`,
          name: c.name,
          isGroup: true,
          botEnabled: c.botEnabled,
          subtitle: 'Grupo de WhatsApp',
          pending: false,
          contact: c,
        })),
    [contacts]
  );

  // Bloqueados: nunca reciben respuesta del bot, sin importar ningún otro switch (ver el chequeo
  // al principio de WhatsappService.handleIncomingMessage, del lado del backend).
  const blacklistRows = useMemo<DisplayRow[]>(
    () =>
      contacts
        .filter((c) => c.isBlacklisted)
        .map((c) => ({
          key: `real:${c.id}`,
          name: c.name,
          isGroup: c.isGroup,
          botEnabled: c.botEnabled,
          subtitle: /^\d+$/.test(phoneOf(c.jid)) ? `+${phoneOf(c.jid)}` : phoneOf(c.jid),
          pending: false,
          contact: c,
        })),
    [contacts]
  );

  const tabList = tab === 'contacts' ? contactRows : tab === 'groups' ? groupRows : blacklistRows;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabList;
    return tabList.filter((r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }, [tabList, search]);

  useEffect(() => {
    setPage(0);
  }, [search, tab]);

  // Cierra el dropdown de país al tocar afuera — es un menú propio (no un <select> nativo,
  // que no puede mostrar la banderita SVG dentro de cada <option>), así que hay que manejar esto
  // a mano.
  useEffect(() => {
    if (!countryMenuOpen) return;
    // Ojo con Shadow DOM: `e.target` de un listener en `document` (fuera del Shadow Root donde
    // vive todo el panel) llega "retargeteado" al host del Shadow DOM para CUALQUIER clic adentro
    // — nunca al botón real que se tocó. `contains()` contra ese target siempre da falso, así que
    // este handler creía que TODO clic (incluso en un país de la lista) era "afuera" y cerraba el
    // menú antes de que el clic llegara a seleccionar nada. `composedPath()` sí devuelve el
    // camino real cruzando el límite del Shadow DOM.
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      if (countryMenuRef.current && !path.includes(countryMenuRef.current)) {
        setCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryMenuOpen]);

  useEffect(() => {
    if (!blacklistCountryMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      if (blacklistCountryMenuRef.current && !path.includes(blacklistCountryMenuRef.current)) {
        setBlacklistCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [blacklistCountryMenuOpen]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const enabledCount = tabList.filter((r) => r.botEnabled).length;

  return (
    <Modal
      title="Bot habilitado por contacto"
      onClose={onClose}
      headerColor="bg-[#9e1114]"
      footer={
        // Cada switch ya se guarda solo al tocarlo (ver toggleRow) — este botón no dispara un
        // guardado adicional, solo cierra confirmando que los cambios quedaron aplicados.
        <button
          onClick={onClose}
          className="w-full bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          Guardar
        </button>
      }
    >
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error}</div>}

      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTab('contacts')}
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
            tab === 'contacts'
              ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Contactos ({contactRows.length})
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
            tab === 'groups'
              ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Grupos ({groupRows.length})
        </button>
        <button
          onClick={() => setTab('blacklist')}
          className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer ${
            tab === 'blacklist'
              ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <ShieldBan className="w-3 h-3 shrink-0" /> Blacklist ({blacklistRows.length})
        </button>
      </div>

      {tab === 'blacklist' ? (
        <div className="flex items-center gap-1.5">
          <div className="relative shrink-0" ref={blacklistCountryMenuRef}>
            <button
              type="button"
              onClick={() => setBlacklistCountryMenuOpen((v) => !v)}
              title="País (solo aplica si escribís un número sin +)"
              className="flex items-center gap-1 border border-slate-300 dark:border-slate-700 rounded-lg pl-1.5 pr-1 py-1.5 text-[10.5px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs cursor-pointer transition-colors hover:border-[#9e1114]"
            >
              <CountryFlag code={blacklistCountryCode} />
              <span>+{blacklistCountryCode}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {blacklistCountryMenuOpen && (
              <div className="absolute z-10 top-full left-0 mt-1 w-44 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setBlacklistCountryCode(c.code);
                      setBlacklistCountryMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
                      c.code === blacklistCountryCode ? 'bg-slate-50 dark:bg-slate-700/60 font-bold' : ''
                    }`}
                  >
                    <CountryFlag code={c.code} />
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">+{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={blacklistPhone}
            onChange={(e) => setBlacklistPhone(e.target.value)}
            placeholder="Bloquear por número de WhatsApp"
            className={`${fieldInputClass} flex-1`}
          />
          <button
            onClick={handleAddToBlacklist}
            disabled={blacklisting || !blacklistPhone.trim()}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-40 text-white transition-colors cursor-pointer"
            title="Bloquear número"
          >
            {blacklisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldBan className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <div className="relative shrink-0" ref={countryMenuRef}>
              <button
                type="button"
                onClick={() => setCountryMenuOpen((v) => !v)}
                title="País (solo aplica si escribís un número sin +)"
                className="flex items-center gap-1 border border-slate-300 dark:border-slate-700 rounded-lg pl-1.5 pr-1 py-1.5 text-[10.5px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs cursor-pointer transition-colors hover:border-[#9e1114]"
              >
                <CountryFlag code={addCountryCode} />
                <span>+{addCountryCode}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {countryMenuOpen && (
                <div className="absolute z-10 top-full left-0 mt-1 w-44 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
                  {COUNTRY_CODES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setAddCountryCode(c.code);
                        setCountryMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
                        c.code === addCountryCode ? 'bg-slate-50 dark:bg-slate-700/60 font-bold' : ''
                      }`}
                    >
                      <CountryFlag code={c.code} />
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                      <span className="text-slate-400 dark:text-slate-500">+{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="Agregar por número o nombre de WhatsApp"
              className={`${fieldInputClass} flex-1`}
            />
            <button
              onClick={handleAddContact}
              disabled={adding || !addPhone.trim()}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-40 text-white transition-colors cursor-pointer"
              title="Agregar contacto"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#9e1114] hover:text-[#9e1114] dark:hover:text-red-400 transition-colors cursor-pointer"
              title="Importar contactos desde Excel/CSV"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportResult(null);
                  setImportFile(file);
                }
                e.target.value = '';
              }}
            />
          </div>
          <button
            onClick={downloadTemplate}
            className="self-start flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-[#9e1114] dark:hover:text-red-400 font-semibold cursor-pointer transition-colors -mt-1.5"
          >
            <Download className="w-3 h-3" /> Descargar plantilla de ejemplo (CSV)
          </button>
        </>
      )}

      {importResult && (
        <div className="flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">
            Se crearon {importResult.created} contacto{importResult.created === 1 ? '' : 's'}, se actualizaron {importResult.updated}
            {importResult.errors > 0 ? `, ${importResult.errors} error${importResult.errors === 1 ? '' : 'es'}` : ''}.
          </span>
          <button onClick={() => setImportResult(null)} className="shrink-0 hover:text-emerald-950 dark:hover:text-emerald-100 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {importFile ? (
        <BulkImportPreview
          file={importFile}
          existingContacts={contacts}
          onCancel={() => setImportFile(null)}
          onImported={handleImported}
        />
      ) : (
        <>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'contacts' ? 'Buscar contacto...' : tab === 'groups' ? 'Buscar grupo...' : 'Buscar en blacklist...'}
            className={`${fieldInputClass} pl-8`}
          />
        </div>
        {tab !== 'blacklist' && (
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            title="Sincronizar contactos y grupos reales de WhatsApp"
            className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#9e1114] hover:text-[#9e1114] dark:hover:text-red-400 disabled:opacity-40 text-[11px] font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-0.5">
        <span>{tabList.length} {tab === 'contacts' ? 'contacto' : tab === 'groups' ? 'grupo' : 'bloqueado'}{tabList.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2.5">
          {tab !== 'blacklist' && <span>{enabledCount} habilitado{enabledCount === 1 ? '' : 's'}</span>}
          <button
            onClick={handleExport}
            disabled={tabList.length === 0}
            title="Exportar esta lista a CSV"
            className="flex items-center gap-1 hover:text-[#9e1114] dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3" /> Exportar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 rounded-xl p-2.5 min-h-[280px]">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
          </div>
        ) : pageRows.length === 0 ? (
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 text-center py-8 font-medium">
            {tabList.length === 0
              ? tab === 'contacts'
                ? 'Todavía no hay contactos sincronizados.'
                : tab === 'groups'
                ? 'Todavía no hay grupos sincronizados.'
                : 'Todavía no bloqueaste a nadie.'
              : 'Sin resultados para esa búsqueda.'}
          </p>
        ) : (
          pageRows.map((row) => (
            <div
              key={row.key}
              className={`flex items-center justify-between gap-2 py-1 px-1 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800/60 ${
                row.pending ? 'opacity-90' : ''
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <button
                  onClick={() => handleAvatarClick(row)}
                  disabled={busyKey === row.key}
                  title={row.pending ? 'Buscar en WhatsApp y confirmar su número' : 'Abrir este chat en WhatsApp'}
                  className={`w-7 h-7 rounded-full ${
                    row.pending ? 'bg-amber-500 border-2 border-dashed border-amber-300' : avatarColorFor(row.contact!.jid)
                  } text-white flex items-center justify-center text-[11px] font-bold shrink-0 cursor-pointer hover:brightness-110 disabled:opacity-60 transition-all`}
                >
                  {busyKey === row.key ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : row.pending ? (
                    <HelpCircle className="w-3.5 h-3.5" />
                  ) : row.isGroup ? (
                    <Users className="w-3.5 h-3.5" />
                  ) : (
                    row.name.charAt(0).toUpperCase()
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{row.name}</p>
                  <p className={`text-[10px] truncate ${row.pending ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {row.subtitle}
                  </p>
                  {tab !== 'blacklist' && isHandoffPaused(row.contact) && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
                      ⏸ En manos de un asesor
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {tab !== 'blacklist' && isHandoffPaused(row.contact) && (
                  <button
                    onClick={() => handleResumeBot(row.contact!)}
                    disabled={busyKey === row.key}
                    title="Reactivar el bot para este contacto"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {busyKey === row.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Reactivar bot
                  </button>
                )}
                {tab === 'blacklist' ? (
                  <button
                    onClick={() => handleUnblock(row.contact!)}
                    disabled={busyKey === row.key}
                    title="Desbloquear este número"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {busyKey === row.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )}
                    Desbloquear
                  </button>
                ) : (
                  <>
                    {!row.pending && !row.isGroup && (
                      <button
                        onClick={() => refreshContact(row.contact!)}
                        disabled={busyKey === row.key}
                        title="Recargar (por si quedó mal agregado)"
                        className="p-1 rounded-md text-slate-400 hover:text-[#9e1114] dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => removeRow(row)}
                      disabled={busyKey === row.key}
                      title={row.pending ? 'Descartar de la lista' : 'Borrar este contacto de la lista'}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <Toggle
                      size="sm"
                      checked={row.botEnabled}
                      disabled={savingKey === row.key || busyKey === row.key}
                      onChange={(v) => handleToggle(row, v)}
                    />
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-0.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-[#9e1114] dark:hover:text-red-400 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </button>
          <span>Página {currentPage + 1} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-[#9e1114] dark:hover:text-red-400 cursor-pointer"
          >
            Siguiente <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
        </>
      )}
    </Modal>
  );
};

export default ContactBotSwitchesModal;
