import React, { useState } from 'react';
import { MessageSquare, Bot, BarChart3, Settings, ShieldCheck, UserCheck, Search, Send, Plus, Loader2 } from 'lucide-react';
import TablePagination from './components/ui/TablePagination';

export default function App() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedChat, setSelectedChat] = useState(1);
  const [messageText, setMessageText] = useState('');

  // Ejemplo de datos para demostración
  const chats = [
    { id: 1, name: 'Juan Pérez (Distribuidora Sur)', phone: '+54 9 11 4567-8901', lastMsg: 'Necesito consultar el stock de cajas de agua', time: '12:34 PM', unread: 2, tag: 'Cliente VIP' },
    { id: 2, name: 'María Gómez (Logística Global)', phone: '+54 9 11 9876-5432', lastMsg: 'Perfecto, quedo a la espera del presupuesto', time: '11:15 AM', unread: 0, tag: 'Cotización' },
    { id: 3, name: 'Carlos Rodríguez', phone: '+54 9 11 3333-2222', lastMsg: 'Se me rompió la cafetera de oficina', time: 'Ayer', unread: 0, tag: 'Soporte' },
  ];

  const messages = [
    { id: 1, sender: 'customer', text: 'Hola buenas tardes, necesito hacer una consulta', time: '12:30 PM' },
    { id: 2, sender: 'bot', text: '¡Hola! Soy el asistente virtual de Tactica Flow. ¿En qué puedo ayudarte hoy?', time: '12:30 PM' },
    { id: 3, sender: 'customer', text: 'Necesito consultar el stock de cajas de agua para hacer un pedido', time: '12:34 PM' },
  ];

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Sidebar Principal */}
      <aside className="w-16 md:w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between p-3">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg">
              T
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-base tracking-tight leading-none text-zinc-900 dark:text-white">Táctica Flow</h1>
              <span className="text-[10px] text-zinc-400 font-medium">CONNECT & AI</span>
            </div>
          </div>

          {/* Menú Navegación */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'inbox'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="hidden md:inline">Bandeja de Chats</span>
            </button>

            <button
              onClick={() => setActiveTab('bots')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'bots'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span className="hidden md:inline">Bots & Agentes IA</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden md:inline">Reportes</span>
            </button>
          </nav>
        </div>

        {/* Configuración */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Settings className="w-5 h-5" />
            <span className="hidden md:inline">Configuración</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'inbox' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Lista de Conversaciones */}
            <section className="w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-white">Chats</h2>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> WhatsApp Conectado
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar chat o teléfono..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm border-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              {/* Lista Scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`p-4 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                      selectedChat === chat.id
                        ? 'bg-zinc-100 dark:bg-zinc-800/80 border-l-4 border-black dark:border-white'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate text-zinc-900 dark:text-zinc-100">{chat.name}</h3>
                        <span className="text-[11px] text-zinc-400">{chat.time}</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-1.5">{chat.lastMsg}</p>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md">
                        {chat.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ventana de Chat */}
            <section className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950">
              {/* Header Chat */}
              <header className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-zinc-900 dark:text-white">Juan Pérez (Distribuidora Sur)</h2>
                  <p className="text-xs text-zinc-500">+54 9 11 4567-8901 • Asignado a: Bot Inteligente Táctica</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-black hover:bg-black/90 text-white rounded-full text-xs font-medium dark:bg-white dark:text-black dark:hover:bg-white/90">
                    Vincular con Táctica ERP
                  </button>
                </div>
              </header>

              {/* Contenido de Mensajes */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'customer' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-sm shadow-sm ${
                        msg.sender === 'customer'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-800'
                          : 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="block text-[10px] opacity-60 text-right mt-1">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input para responder */}
              <footer className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe un mensaje o presiona '/' para plantillas..."
                  className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm border-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <button className="p-2.5 bg-black hover:bg-black/90 text-white rounded-full dark:bg-white dark:text-black dark:hover:bg-white/90">
                  <Send className="w-4 h-4" />
                </button>
              </footer>
            </section>
          </div>
        )}

        {activeTab === 'bots' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Motor de Bots & Agentes IA</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Configura las respuestas automáticas, flujos de decisión y agentes inteligentes integrados con Táctica ERP.</p>
            <TablePagination currentPage={1} totalPages={5} totalRecords={50} pageLimit={10} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Reportes & Estadísticas</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Métricas de tiempo de respuesta, chats atendidos y pedidos generados desde WhatsApp.</p>
            <TablePagination currentPage={1} totalPages={2} totalRecords={15} pageLimit={10} />
          </div>
        )}
      </main>
    </div>
  );
}
