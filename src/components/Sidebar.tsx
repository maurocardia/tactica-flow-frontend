// src/components/Sidebar.tsx
import React from 'react';
import { useActiveChat } from '@/hooks/useActiveChat';
import { useContactNotes } from '@/hooks/useContactNotes';

import Header from './sidebar/Header';
import ContactCard from './sidebar/ContactCard';
import AiModule from './sidebar/AiModule';
import NotesCard from './sidebar/NotesCard';
import Ficha360 from './sidebar/Ficha360';
import ToolsGrid from './sidebar/ToolsGrid';

export default function Sidebar() {
    const { activeContact, refreshChat } = useActiveChat();
    const { note, setNote, isSaved, saveNote } = useContactNotes(activeContact);

    return (
        <aside className="w-[360px] h-full bg-white border-l border-slate-300 flex flex-col flex-shrink-0 text-slate-800 font-sans select-none overflow-hidden">
            <Header onRefresh={refreshChat} />

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                <ContactCard contactName={activeContact} />
                <AiModule />
                <NotesCard
                    note={note}
                    setNote={setNote}
                    onSave={saveNote}
                    isSaved={isSaved}
                    disabled={activeContact === 'Sin chat seleccionado'}
                />
                <Ficha360 />
                <ToolsGrid />
            </div>
        </aside>
    );
}