import { useState, useEffect } from 'react';
import { StorageService } from '@/services/storage.service';

export const useContactNotes = (contactName: string) => {
    const [note, setNote] = useState<string>('');
    const [isSaved, setIsSaved] = useState<boolean>(false);

    useEffect(() => {
        if (contactName === 'Sin chat seleccionado') {
            setNote('');
            return;
        }
        StorageService.getNote(contactName).then(setNote);
    }, [contactName]);

    const saveNote = async () => {
        if (contactName === 'Sin chat seleccionado') return;
        await StorageService.saveNote(contactName, note);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return { note, setNote, isSaved, saveNote };
};