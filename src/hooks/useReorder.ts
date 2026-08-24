import { useRef, useState } from 'react';

// DnD por Pointer Events (no HTML5 drag-and-drop nativo, que no funciona bien dentro de un
// Shadow DOM). Reordena por índice: al entrar con el puntero sobre otro ítem mientras se
// arrastra, intercambia posiciones. Sin persistencia, igual que en el mockup del cliente.
export function useReorder<T>(items: T[], setItems: (items: T[]) => void) {
  const [reordering, setReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  const toggleReordering = () => {
    setReordering((v) => !v);
    setDraggedIndex(null);
    draggedIndexRef.current = null;
  };

  const startDrag = (index: number) => {
    if (!reordering) return;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
  };

  const enterDrag = (index: number) => {
    const from = draggedIndexRef.current;
    if (!reordering || from === null || from === index) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setItems(next);
    draggedIndexRef.current = index;
    setDraggedIndex(index);
  };

  const endDrag = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  };

  return { reordering, draggedIndex, toggleReordering, startDrag, enterDrag, endDrag };
}
