import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Send, Save, User, RefreshCw, Settings,
    Bot, Clock, Repeat, Sparkles, FileText, Mic, PenTool,
    Search, ChevronRight, Phone, ArrowUpRight, UserPlus,
    Receipt, Zap, FolderDown, Calendar, Pin
} from 'lucide-react';

const QUICK_RESPONSES = [
    "¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte hoy?",
    "Un momento por favor, ya reviso tu información.",
    "¡Muchas gracias por tu compra! Quedamos atentos a cualquier duda.",
    "En breve un asesor de nuestro equipo te atenderá."
];

export default function Sidebar() {
    // Lógica existente mantenida
    const [activeContact, setActiveContact] = useState<string>('Sin chat seleccionado');
    const [note, setNote] = useState<string>('');
    const [savedStatus, setSavedStatus] = useState<boolean>(false);

    // Estados adicionales para replicar el layout de la maqueta
    const [activeTab, setActiveTab] = useState<string>('historial');
    const [filterText, setFilterText] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('Todos');
    const [botActive, setBotActive] = useState<boolean>(true);
    const [kbSelect, setKbSelect] = useState<string>('Ventas');

    // 1. Detección multiselector para WhatsApp Web
    const detectActiveChat = () => {
        const selectors = [
            '#main header div[role="button"] span[title]',
            '#main header span[title]',
            '#main header h2 span',
            '#main header div._amoi span[title]',
            '#main header div span[dir="auto"]'
        ];

        let foundName: string | null = null;

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                const titleAttr = el.getAttribute('title');
                const textContent = el.textContent?.trim();

                if (titleAttr && titleAttr.length > 0) {
                    foundName = titleAttr;
                    break;
                } else if (textContent && textContent.length > 0 && !textContent.includes(':') && textContent.toLowerCase() !== 'en línea') {
                    foundName = textContent;
                    break;
                }
            }
        }

        if (foundName) {
            setActiveContact(foundName);
            loadNoteForContact(foundName);
        } else {
            setActiveContact('Sin chat seleccionado');
            setNote('');
        }
    };

    const loadNoteForContact = (contactName: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get([`note_${contactName}`], (result) => {
                const storedNote = result[`note_${contactName}`];
                setNote(typeof storedNote === 'string' ? storedNote : '');
            });
        }
    };

    const saveNote = () => {
        if (activeContact === 'Sin chat seleccionado') return;

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ [`note_${activeContact}`]: note }, () => {
                setSavedStatus(true);
                setTimeout(() => setSavedStatus(false), 2000);
            });
        }
    };

    const insertTextToWhatsApp = (text: string) => {
        const messageBox = document.querySelector('#main footer div[contenteditable="true"]') as HTMLElement;

        if (messageBox) {
            messageBox.focus();
            document.execCommand('insertText', false, text);
        } else {
            alert('Abre un chat para poder enviar la respuesta rápida.');
        }
    };

    useEffect(() => {
        detectActiveChat();
        const pollInterval = setInterval(detectActiveChat, 1000);

        const observer = new MutationObserver(() => {
            detectActiveChat();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            clearInterval(pollInterval);
            observer.disconnect();
        };
    }, []);

    return (
        <aside className="w-[360px] h-full bg-white border-l border-slate-300 flex flex-col flex-shrink-0 text-slate-800 font-sans select-none overflow-hidden">

            {/* 1. Header Tacticasoft */}
            <div className="bg-[#9e1114] text-white p-3 flex items-start justify-between shadow-sm">
                <div>
                    <div className="flex items-center gap-2 font-bold text-[14.5px]">
                        <div className="w-7 h-7 rounded-full bg-white text-[#9e1114] flex items-center justify-center font-black text-xs">
                            T
                        </div>
                        TACTICA · WA Sync
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] mt-1 text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Conectado
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                        H. López · Tacticasoft S.A.
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={detectActiveChat}
                        className="text-white hover:opacity-80 transition p-1"
                        title="Actualizar chat"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        className="text-white hover:opacity-80 transition p-1"
                        title="Configuración"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Cuerpo con Scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">

                {/* 2. Tarjeta Contacto Vinculado */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold text-xs shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-900 truncate">
                                {activeContact}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                {activeContact !== 'Sin chat seleccionado' ? 'Cliente Activo' : 'Ningún chat detectado'}
                            </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-[#e8181e] font-semibold border border-red-100 shrink-0">
                            Vinculado
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <Bot className="w-3 h-3" /> Autoatención activa
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-red-50 border border-red-200 text-[#9e1114] cursor-pointer hover:bg-red-100">
                            <Clock className="w-3 h-3" /> 1 programado
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-pointer">
                            <Repeat className="w-3 h-3" /> Secuencia 2/4
                        </span>
                    </div>
                </div>

                {/* 3. Módulo Inteligencia Artificial */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-purple-700">
                            <Sparkles className="w-3.5 h-3.5" /> Inteligencia Artificial
                        </span>
                        <span className="normal-case font-normal text-slate-400">OpenAI</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                            <FileText className="w-3.5 h-3.5" /> Resumir charla
                        </button>
                        <button className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                            <Mic className="w-3.5 h-3.5" /> Transcribir
                            <span className="bg-purple-700 text-white rounded-full text-[10px] px-1.5 py-0.2">3</span>
                        </button>
                        <button className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                            <PenTool className="w-3.5 h-3.5" /> Redactar respuesta
                        </button>
                    </div>
                </div>

                {/* 4. Notas del Cliente (Integrado con tu funcionalidad) */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#e8181e]" />
                            Notas del Cliente
                        </span>
                        {savedStatus && (
                            <span className="text-[10px] text-emerald-600 font-medium">¡Guardado!</span>
                        )}
                    </div>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                            activeContact !== 'Sin chat seleccionado'
                                ? 'Escribe notas o recordatorios para este contacto...'
                                : 'Abre un chat para tomar notas...'
                        }
                        disabled={activeContact === 'Sin chat seleccionado'}
                        className="w-full h-20 p-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-red-400 text-slate-800 resize-none disabled:opacity-50"
                    />
                    <button
                        onClick={saveNote}
                        disabled={activeContact === 'Sin chat seleccionado'}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#e8181e] hover:bg-[#9e1114] disabled:opacity-50 text-white font-medium text-xs rounded-md transition-colors shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Guardar Nota
                    </button>
                </div>

                {/* 5. Ficha 360° TACTICA */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        👤 Ficha 360° · TACTICA
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1.5 border-b border-slate-100 scrollbar-none">
                        {["historial", "pendientes", "presupuestos", "facturacion", "compras", "ctacte"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition ${activeTab === tab
                                    ? "bg-[#9e1114] text-white"
                                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                                    }`}
                            >
                                {tab === "ctacte" ? "Cta. Cte." : tab}
                            </button>
                        ))}
                    </div>

                    {/* Contenido según Tab */}
                    <div className="mt-2 text-xs">
                        {activeTab === "historial" && (
                            <div className="space-y-2">
                                <div className="flex gap-1.5">
                                    <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar..."
                                            value={filterText}
                                            onChange={(e) => setFilterText(e.target.value)}
                                            className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-red-400"
                                        />
                                    </div>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="border border-slate-200 rounded-md px-1.5 text-xs text-slate-600 focus:outline-none"
                                    >
                                        <option>Todos</option>
                                        <option>Charla</option>
                                        <option>Llamada</option>
                                        <option>Email</option>
                                    </select>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    <div className="py-2 flex items-center justify-between hover:bg-red-50/50 p-1 rounded cursor-pointer transition">
                                        <div>
                                            <div className="font-semibold text-slate-800">💬 Charla — Presupuesto licencias</div>
                                            <div className="text-[11px] text-slate-500">12/07 · 6 mensajes · 👤 H. López</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="py-2 flex items-center justify-between hover:bg-red-50/50 p-1 rounded cursor-pointer transition">
                                        <div>
                                            <div className="font-semibold text-slate-800">📞 Llamada saliente</div>
                                            <div className="text-[11px] text-slate-500">10/07 · 8 min · 👤 M. Fernández</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab !== "historial" && (
                            <div className="py-4 text-center text-slate-400 italic">
                                Sin registros activos en {activeTab}.
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Chatbot / Autoatención */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700">🤖 Chatbot / Autoatención</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={botActive}
                                onChange={() => setBotActive(!botActive)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#e8181e]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-600">Base de conocimiento</span>
                        <select
                            value={kbSelect}
                            onChange={(e) => setKbSelect(e.target.value)}
                            className="border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                        >
                            <option value="Ventas">Ventas</option>
                            <option value="Soporte técnico">Soporte técnico</option>
                            <option value="Administración">Administración</option>
                        </select>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-1.5 rounded font-semibold transition">
                            Editar flujo
                        </button>
                        <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-1.5 rounded font-semibold transition">
                            Bases de conoc.
                        </button>
                    </div>
                </div>

                {/* 7. Respuestas Rápidas (Integrado con tu funcionalidad) */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-700">Respuestas Rápidas</span>
                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[180px] pr-1">
                        {QUICK_RESPONSES.map((resp, index) => (
                            <div
                                key={index}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 hover:border-red-300 transition-all flex justify-between items-start gap-2 group"
                            >
                                <p className="flex-1 leading-snug">{resp}</p>
                                <button
                                    onClick={() => insertTextToWhatsApp(resp)}
                                    className="p-1 rounded bg-red-50 hover:bg-red-100 text-[#e8181e] transition-colors shrink-0"
                                    title="Insertar en el chat"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 8. Grid de Herramientas */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        🧰 Herramientas
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-semibold text-slate-700">
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Phone className="w-4 h-4 text-slate-600" /> Marcador
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <ArrowUpRight className="w-4 h-4 text-slate-600" /> Ir a
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <UserPlus className="w-4 h-4 text-slate-600" /> Reasignar
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Receipt className="w-4 h-4 text-slate-600" /> Comprobante
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Zap className="w-4 h-4 text-slate-600" /> Plantillas
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <FolderDown className="w-4 h-4 text-slate-600" /> Historial
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Calendar className="w-4 h-4 text-slate-600" /> Prog. mensaje
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Pin className="w-4 h-4 text-slate-600" /> Prog. actividad
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                            <Repeat className="w-4 h-4 text-slate-600" /> Secuencias
                        </button>
                    </div>
                </div>

            </div>
        </aside>
    );
}