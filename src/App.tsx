import React, { useState } from 'react';
import { MessageSquare, Bot, BarChart3, Settings, Search, Send, Sparkles, CheckCircle2, User, Phone, Zap } from 'lucide-react';
import TablePagination from './components/ui/TablePagination';

interface Chat {
  id: number;
  name: string;
  phone: string;
  lastMsg: string;
  time: string;
  unread: number;
  tag: string;
  status: 'active' | 'bot' | 'resolved';
}

interface Message {
  id: number;
  sender: 'customer' | 'agent' | 'bot';
  text: string;
  time: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'bots' | 'analytics'>('inbox');
  const [selectedChat, setSelectedChat] = useState<number>(1);
  const [messageText, setMessageText] = useState<string>('');

  const chats: Chat[] = [
    { id: 1, name: 'Juan Pérez (Distribuidora Sur)', phone: '+54 9 11 4567-8901', lastMsg: 'Necesito consultar el stock de cajas de agua', time: '12:34 PM', unread: 2, tag: 'Cliente VIP', status: 'bot' },
    { id: 2, name: 'María Gómez (Logística Global)', phone: '+54 9 11 9876-5432', lastMsg: 'Perfecto, quedo a la espera del presupuesto', time: '11:15 AM', unread: 0, tag: 'Cotización', status: 'active' },
    { id: 3, name: 'Carlos Rodríguez', phone: '+54 9 11 3333-2222', lastMsg: 'Se me rompió la cafetera de oficina', time: 'Ayer', unread: 0, tag: 'Soporte', status: 'resolved' },
  ];

  const messages: Message[] = [
    { id: 1, sender: 'customer', text: 'Hola buenas tardes, necesito hacer una consulta urgente.', time: '12:30 PM' },
    { id: 2, sender: 'bot', text: '¡Hola! Soy el asistente IA de Tactica Flow. ¿En qué puedo ayudarte hoy?', time: '12:30 PM' },
    { id: 3, sender: 'customer', text: 'Necesito consultar el stock de 30 cajas de agua mineral para registrar un pedido.', time: '12:34 PM' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar Principal (Glassmorphism) */}
      <aside className="w-16 md:w-64 glass-panel border-r border-white/10 flex flex-col justify-between p-3 z-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-cyan-500/20">
              T
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-base tracking-tight leading-none text-white">Táctica Flow</h1>
              <span className="text-[10px] text-cyan-400 font-semibold tracking-wider">CONNECT & AI</span>
            </div>
          </div>

          {/* Menú Navegación */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'inbox'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="hidden md:inline">Bandeja de Chats</span>
            </button>

            <button
              onClick={() => setActiveTab('bots')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'bots'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span className="hidden md:inline">Bots & Agentes IA</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden md:inline">Reportes</span>
            </button>
          </nav>
        </div>

        {/* Configuración */}
        <div className="border-t border-white/10 pt-3">
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-5 h-5" />
            <span className="hidden md:inline">Configuración</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="flex-1 flex overflow-hidden z-10">
        {activeTab === 'inbox' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Lista de Conversaciones */}
            <section className="w-full md:w-80 lg:w-96 glass-panel border-r border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-white tracking-tight">Conversaciones</h2>
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> WA Conectado
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar chat, empresa o teléfono..."
                    className="w-full pl-9 pr-4 py-2 glass-input text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {/* Lista Scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      selectedChat === chat.id
                        ? 'bg-white/10 border-l-4 border-cyan-400 backdrop-blur-md'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate text-white">{chat.name}</h3>
                        <span className="text-[10px] text-slate-400">{chat.time}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mb-2">{chat.lastMsg}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-md">
                          {chat.tag}
                        </span>
                        {chat.status === 'bot' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Bot IA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ventana de Chat Glassmorphism */}
            <section className="flex-1 flex flex-col glass-card">
              {/* Header Chat */}
              <header className="p-4 glass-panel border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-white flex items-center gap-2">
                    Juan Pérez (Distribuidora Sur)
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                      Táctica Sync
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">+54 9 11 4567-8901 • Asignado a: Bot IA de Táctica</p>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-white text-black font-semibold rounded-full text-xs transition-all hover:bg-white/90 shadow-lg shadow-white/10 active:scale-95">
                    Vincular con Táctica ERP
                  </button>
                </div>
              </header>

              {/* Mensajes */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'customer' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-md p-4 rounded-2xl text-sm backdrop-blur-md shadow-lg ${
                        msg.sender === 'customer'
                          ? 'glass-card border border-white/10 text-slate-100 rounded-tl-none'
                          : 'bg-white text-black font-medium rounded-tr-none shadow-white/5'
                      }`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5" /> Asistente IA Táctica
                        </div>
                      )}
                      <p>{msg.text}</p>
                      <span className={`block text-[10px] mt-1.5 text-right ${msg.sender === 'customer' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responder */}
              <footer className="p-4 glass-panel border-t border-white/10 flex items-center gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe un mensaje o usa '/' para automatizaciones de Táctica..."
                  className="flex-1 px-4 py-3 glass-input text-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button className="p-3 bg-white text-black hover:bg-white/90 rounded-full transition-all shadow-lg active:scale-95">
                  <Send className="w-4 h-4" />
                </button>
              </footer>
            </section>
          </div>
        )}

        {activeTab === 'bots' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-white">Motor de Bots & Agentes IA (TypeScript)</h2>
            <p className="text-slate-400 mb-6">Gestiona las respuestas automáticas, flujos de decisión y agentes con Function Calling hacia Táctica ERP.</p>
            <TablePagination currentPage={1} totalPages={5} totalRecords={50} pageLimit={10} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-white">Reportes & Analítica Comercial</h2>
            <p className="text-slate-400 mb-6">Métricas en tiempo real de WhatsApp, tiempos de respuesta y cotizaciones creadas en Táctica ERP.</p>
            <TablePagination currentPage={1} totalPages={2} totalRecords={15} pageLimit={10} />
          </div>
        )}
      </main>
    </div>
  );
}
