import React from 'react';
import { RefreshCw, Settings, PanelRightClose, Sun, Moon } from 'lucide-react';
import { useModal } from '@/state/ModalContext';
import { useAuth } from '@/state/AuthContext';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { useAppState } from '@/state/AppStateContext';
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
    const { config, setConfig } = useAppState();
    const isDark = config.theme === 'dark';

    const toggleTheme = () => {
        setConfig((c) => ({ ...c, theme: c.theme === 'dark' ? 'light' : 'dark' }));
    };

    return (
        <div className="bg-gradient-to-r from-[#9e1114] via-[#b81519] to-[#800d10] text-white p-3.5 flex items-start justify-between shadow-md border-b border-white/10">
            <div>
                <div className="flex items-center gap-2 font-bold text-[15px] tracking-tight">
                    <img
                        src={chrome.runtime.getURL('icons/icon.png')}
                        alt="TACTICA"
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-white/30 shadow-sm"
                    />
                    <span>TACTICA · WA Sync</span>
                </div>
                {user && (
                    <button
                        onClick={() => openModal('config')}
                        className="flex items-center gap-1.5 text-[11px] font-medium mt-1.5 px-2 py-0.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/10 transition-colors"
                        title="Ver conexión de WhatsApp en Configuración"
                    >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${WA_DOT_COLOR[status]} shadow-xs`}></span>
                        <span>{WA_LABEL[status]}</span>
                    </button>
                )}
                <div className="text-[11px] text-white/80 mt-1 font-medium">
                    {user ? (
                        <>{user.name} · {user.email}</>
                    ) : (
                        <button onClick={() => openModal('config')} className="underline hover:text-white font-semibold">
                            Iniciá sesión en Configuración
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 bg-black/15 p-1 rounded-xl border border-white/10 backdrop-blur-xs">
                <button
                    onClick={toggleTheme}
                    className="text-white/90 hover:text-white hover:bg-white/15 transition p-1.5 rounded-lg"
                    title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                >
                    {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                    onClick={onRefresh}
                    className="text-white/90 hover:text-white hover:bg-white/15 transition p-1.5 rounded-lg"
                    title="Actualizar chat"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    onClick={() => openModal('config')}
                    className="text-white/90 hover:text-white hover:bg-white/15 transition p-1.5 rounded-lg"
                    title="Configuración"
                >
                    <Settings className="w-4 h-4" />
                </button>
                <button
                    onClick={closePanel}
                    className="text-white/90 hover:text-white hover:bg-white/15 transition p-1.5 rounded-lg"
                    title="Cerrar panel"
                >
                    <PanelRightClose className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
export default Header;