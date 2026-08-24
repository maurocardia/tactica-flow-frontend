import React from 'react';
import { RefreshCw, Settings, PanelRightClose } from 'lucide-react';
import { useModal } from '@/state/ModalContext';
import { useAuth } from '@/state/AuthContext';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { WhatsappConnectionStatus } from '@/types/whatsapp';

interface HeaderProps {
    onRefresh?: () => void;
}

// El content script escucha este evento para deslizar el panel fuera de pantalla y devolverle
// el ancho completo a WhatsApp Web — ver src/content/index.tsx (vive fuera del Shadow DOM, así
// que no puede recibir esto como prop de React).
const closePanel = () => window.dispatchEvent(new CustomEvent('tactica-flow:toggle-panel'));

const WA_DOT_COLOR: Record<WhatsappConnectionStatus, string> = {
    connected: 'bg-emerald-400',
    connecting: 'bg-amber-400',
    qr_ready: 'bg-amber-400',
    disconnected: 'bg-slate-400',
};

const WA_LABEL: Record<WhatsappConnectionStatus, string> = {
    connected: 'WhatsApp conectado',
    connecting: 'Conectando WhatsApp...',
    qr_ready: 'Esperando código QR',
    disconnected: 'WhatsApp desconectado',
};

export function Header({ onRefresh = () => {} }: HeaderProps) {
    const { openModal } = useModal();
    const { user } = useAuth();
    const { status } = useWhatsappStatus();
    return (
        <div className="bg-[#9e1114] text-white p-3 flex items-start justify-between shadow-sm">
            <div>
                <div className="flex items-center gap-2 font-bold text-[14.5px]">
                    <img
                        src={chrome.runtime.getURL('icons/icon.png')}
                        alt="TACTICA"
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    TACTICA · WA Sync
                </div>
                {user && (
                    <button
                        onClick={() => openModal('config')}
                        className="flex items-center gap-1.5 text-[11px] mt-1 text-slate-200 hover:text-white"
                        title="Ver conexión de WhatsApp en Configuración"
                    >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${WA_DOT_COLOR[status]}`}></span>
                        {WA_LABEL[status]}
                    </button>
                )}
                <div className="text-[11px] text-slate-300 mt-0.5">
                    {user ? (
                        <>{user.name} · {user.email}</>
                    ) : (
                        <button onClick={() => openModal('config')} className="underline hover:text-white">
                            Iniciá sesión en Configuración
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={onRefresh}
                    className="text-white hover:opacity-80 transition p-1"
                    title="Actualizar chat"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    onClick={() => openModal('config')}
                    className="text-white hover:opacity-80 transition p-1"
                    title="Configuración"
                >
                    <Settings className="w-5 h-5" />
                </button>
                <button
                    onClick={closePanel}
                    className="text-white hover:opacity-80 transition p-1"
                    title="Cerrar panel"
                >
                    <PanelRightClose className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
export default Header;