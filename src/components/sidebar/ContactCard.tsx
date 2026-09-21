import React, { useEffect, useMemo, useState } from 'react';
import { User, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { ApiService } from '@/services/api.service';
import { BotContact } from '@/types/botContact';

interface ContactCardProps {
    contactName: string;
}

const normalizeName = (s: string) => s.trim().toLowerCase();

// El control de bot por contacto vive en el modal "Bot habilitado por contacto" y en el ícono del
// header de WhatsApp (ver ExternalBridge, que resuelve el contacto activo contra bot_contacts) —
// esta tarjeta es solo informativa, mostrando el chat detectado. Le suma el banner de "Asesor
// asignado" cuando esta conversación tiene una reserva de asesor sin vencer (el bot NO deja de
// responder por esto, es solo informativo — ver AdvisorService.getActiveHandoffAdvisor en el
// backend): mismo patrón de resolución por nombre que ExternalBridge (polling propio de
// bot_contacts, sin socket — el frontend no tiene un cliente de Socket.io conectado todavía), pero
// acá no se comparte estado con ExternalBridge a propósito, para no acoplar dos componentes que
// hoy son independientes por una lista que ya es liviana.
const ContactCard: React.FC<ContactCardProps> = ({ contactName }) => {
    const { user } = useAuth();
    const isSelected = contactName !== 'Sin chat seleccionado';

    const [botContacts, setBotContacts] = useState<BotContact[]>([]);
    const [reactivating, setReactivating] = useState(false);
    // Cuando se libera a mano, se ignora el handoffExpiresAt que todavía pueda traer el próximo
    // polling (hasta 5s de por medio) — así el banner desaparece de inmediato en vez de esperar a
    // que el backend confirme en la siguiente vuelta.
    const [justReactivatedJid, setJustReactivatedJid] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        if (!user) return;
        const load = () => ApiService.getBotContacts().then(setBotContacts).catch(() => {});
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [user]);

    // Al cambiar de chat, la reactivación "reciente" del contacto anterior deja de ser relevante.
    useEffect(() => {
        setJustReactivatedJid(null);
        setShowConfirmation(false);
    }, [contactName]);

    const activeBotContact = useMemo(() => {
        if (!isSelected) return null;
        const target = normalizeName(contactName);
        return botContacts.find((c) => normalizeName(c.name) === target) || null;
    }, [botContacts, contactName, isSelected]);

    const hasActiveAdvisorReservation =
        !!activeBotContact &&
        activeBotContact.jid !== justReactivatedJid &&
        !!activeBotContact.handoffExpiresAt &&
        new Date(activeBotContact.handoffExpiresAt) > new Date();

    const handleReactivate = async () => {
        if (!activeBotContact || reactivating) return;
        setReactivating(true);
        try {
            await ApiService.unpauseBotContact(activeBotContact.jid);
            setJustReactivatedJid(activeBotContact.jid);
            setBotContacts((prev) =>
                prev.map((c) => (c.id === activeBotContact.id ? { ...c, handoffExpiresAt: null, handoffAdvisorId: null } : c))
            );
            setShowConfirmation(true);
            setTimeout(() => setShowConfirmation(false), 3000);
        } catch (err) {
            console.error('[ContactCard] No se pudo reactivar el bot para este contacto:', err);
        } finally {
            setReactivating(false);
        }
    };

    return (
        <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/15 to-red-600/10 text-[#9e1114] dark:text-red-400 border border-red-200/50 dark:border-red-900/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate tracking-tight">
                        {contactName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <span>{isSelected ? 'Cliente Activo' : 'Ningún chat detectado'}</span>
                    </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 dark:bg-red-950/60 text-[#9e1114] dark:text-red-300 font-bold border border-red-200/60 dark:border-red-800/80 shrink-0 shadow-2xs backdrop-blur-xs">
                    Vinculado
                </span>
            </div>

            {showConfirmation && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Reserva liberada — se le preguntó al cliente si quedó resuelto
                </div>
            )}

            {hasActiveAdvisorReservation && !showConfirmation && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        🟡 Asesor asignado (el bot sigue respondiendo)
                    </span>
                    <button
                        type="button"
                        onClick={handleReactivate}
                        disabled={reactivating}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/60 disabled:opacity-50 cursor-pointer transition-colors shrink-0"
                    >
                        {reactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Liberar asesor
                    </button>
                </div>
            )}
        </div>
    );
};
export default ContactCard;
