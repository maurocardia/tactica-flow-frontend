// src/components/sidebar/flow/FlowCanvas.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Focus,
  Play,
  Save,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { BotFlowConnection, BotFlowData, BotFlowNode, NodeType } from '@/types/bot';
import { FlowPalette } from './FlowPalette';
import { FlowNodeCard } from './FlowNodeCard';
import { FlowEdgeLayer } from './FlowEdgeLayer';
import { NodeConfigDrawer } from './NodeConfigDrawer';
import { FlowSimulatorModal } from './FlowSimulatorModal';

const DEFAULT_INITIAL_FLOW: BotFlowData = {
  id: 'main_flow',
  name: 'Flujo Principal de Atención',
  nodes: [
    {
      id: 'node_trigger_start',
      type: 'TRIGGER',
      title: 'Disparador Inicial',
      position: { x: 120, y: 80 },
      data: {
        name: 'Saludo de Bienvenida',
        keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'],
        replyText: '¡Hola! 👋 Bienvenido a la atención automatizada de Tactica Flow. ¿En qué te podemos ayudar hoy?',
        isActive: true
      }
    },
    {
      id: 'node_menu_main',
      type: 'OPTIONS_MENU',
      title: 'Menú Principal',
      position: { x: 500, y: 80 },
      data: {
        name: 'Menú de Opciones',
        replyText: 'Por favor selecciona una de las siguientes opciones respondiendo con el número:',
        options: [
          { id: 'opt_1', label: '1. Información de Servicios', keyword: '1', targetNodeId: null },
          { id: 'opt_2', label: '2. Consultar Precios y Planes', keyword: '2', targetNodeId: null },
          { id: 'opt_3', label: '3. Hablar con un Asesor', keyword: '3', targetNodeId: null }
        ],
        isActive: true
      }
    },
    {
      id: 'node_ai_info',
      type: 'CALL_AI',
      title: 'Agente de IA',
      position: { x: 900, y: 80 },
      data: {
        name: 'Respuestas con IA y Base de Conocimiento',
        replyText: 'Procesando tu consulta con nuestra Base de Conocimiento...',
        isActive: true
      }
    },
    {
      id: 'node_handoff_agent',
      type: 'HANDOFF',
      title: 'Derivación Humana',
      position: { x: 900, y: 340 },
      data: {
        name: 'Pasar a Asesor Comercial',
        replyText: 'Te estamos transfiriendo con un asesor de nuestro equipo comercial. Aguarda un instante, por favor.',
        isActive: true
      }
    }
  ],
  connections: [
    {
      id: 'conn_init_1',
      sourceNodeId: 'node_trigger_start',
      sourcePortId: 'default',
      targetNodeId: 'node_menu_main'
    },
    {
      id: 'conn_opt_1',
      sourceNodeId: 'node_menu_main',
      sourcePortId: 'opt_1',
      targetNodeId: 'node_ai_info'
    },
    {
      id: 'conn_opt_3',
      sourceNodeId: 'node_menu_main',
      sourcePortId: 'opt_3',
      targetNodeId: 'node_handoff_agent'
    }
  ]
};

interface FlowCanvasProps {
  initialData?: BotFlowData;
  onSaveFlow: (flowData: BotFlowData) => Promise<void>;
  onClose: () => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  initialData,
  onSaveFlow,
  onClose
}) => {
  const [flow, setFlow] = useState<BotFlowData>(() => {
    const raw = initialData && initialData.nodes && initialData.nodes.length > 0
      ? initialData
      : DEFAULT_INITIAL_FLOW;

    // Sanitizar posiciones iniciales para que ninguna sea NaN o undefined
    return {
      ...raw,
      nodes: (raw.nodes || []).map((n, i) => ({
        ...n,
        position: {
          x: Number.isFinite(n?.position?.x) ? n.position.x : 100 + (i % 3) * 320,
          y: Number.isFinite(n?.position?.y) ? n.position.y : 120 + Math.floor(i / 3) * 240
        }
      })),
      connections: raw.connections || []
    };
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<BotFlowNode | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });

  // Connecting Wire
  const [connectingState, setConnectingState] = useState<{
    sourceNodeId: string;
    sourcePortId?: string;
    currentMousePos: { x: number; y: number };
  } | null>(null);

  // Refs de estado para interactuar con eventos nativos sin re-renders destructivos
  const stateRef = useRef({
    flow,
    zoom,
    pan,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    draggingNodeId: null as string | null,
    dragStart: { nodeX: 0, nodeY: 0, clientX: 0, clientY: 0 },
    connectingState: null as {
      sourceNodeId: string;
      sourcePortId?: string;
      currentMousePos: { x: number; y: number };
    } | null
  });

  stateRef.current.flow = flow;
  stateRef.current.zoom = zoom;
  stateRef.current.pan = pan;
  stateRef.current.connectingState = connectingState;

  const canvasRef = useRef<HTMLDivElement>(null);

  // Advertir al usuario si intenta recargar la página con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en el flujo del bot. ¿Estás seguro de que deseas salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Actualizador centralizado con respaldo automático en localStorage
  const updateFlowWithDraft = useCallback((updater: (prev: BotFlowData) => BotFlowData) => {
    setFlow((prev) => {
      const nextFlow = updater(prev);
      stateRef.current.flow = nextFlow;
      setHasUnsavedChanges(true);
      try {
        localStorage.setItem('tactica_flow_draft', JSON.stringify(nextFlow));
      } catch (e) {
        // ignore
      }
      return nextFlow;
    });
  }, []);

  // Convert screen coordinates to canvas space
  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 100, y: 100 };
    const rect = canvasRef.current.getBoundingClientRect();
    const currentPan = stateRef.current.pan;
    const currentZoom = stateRef.current.zoom || 1;
    const x = (screenX - rect.left - currentPan.x) / currentZoom;
    const y = (screenY - rect.top - currentPan.y) / currentZoom;
    return {
      x: Number.isFinite(x) ? x : 100,
      y: Number.isFinite(y) ? y : 100
    };
  }, []);

  // End Connection on Target Node
  const handleEndConnection = useCallback((targetNodeId: string) => {
    const activeConn = stateRef.current.connectingState;
    if (!activeConn) return;
    if (activeConn.sourceNodeId === targetNodeId) {
      setConnectingState(null);
      return;
    }

    updateFlowWithDraft((prev) => {
      const exists = prev.connections.some(
        (c) =>
          c.sourceNodeId === activeConn.sourceNodeId &&
          c.sourcePortId === activeConn.sourcePortId &&
          c.targetNodeId === targetNodeId
      );

      if (exists) return prev;

      const newConn: BotFlowConnection = {
        id: `conn_${Date.now()}`,
        sourceNodeId: activeConn.sourceNodeId,
        sourcePortId: activeConn.sourcePortId || 'default',
        targetNodeId
      };

      return {
        ...prev,
        connections: [...prev.connections, newConn]
      };
    });

    setConnectingState(null);
  }, [updateFlowWithDraft]);

  // Pan canvas on background drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      if (connectingState) {
        setConnectingState(null);
        stateRef.current.connectingState = null;
      }
      stateRef.current.isPanning = true;
      stateRef.current.panStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  // Node Drag Start
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);

    const node = stateRef.current.flow.nodes.find((n) => n.id === nodeId);
    if (node) {
      stateRef.current.draggingNodeId = nodeId;
      stateRef.current.dragStart = {
        nodeX: Number.isFinite(node.position.x) ? node.position.x : 100,
        nodeY: Number.isFinite(node.position.y) ? node.position.y : 100,
        clientX: e.clientX,
        clientY: e.clientY
      };
    }
  };

  // Global mouse move & up listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const { isPanning, panStart, draggingNodeId, dragStart, zoom, connectingState: activeConn } = stateRef.current;

      if (isPanning) {
        setPan({
          x: Math.round(e.clientX - panStart.x),
          y: Math.round(e.clientY - panStart.y)
        });
      } else if (draggingNodeId) {
        const safeZoom = zoom > 0 ? zoom : 1;
        const dx = (e.clientX - dragStart.clientX) / safeZoom;
        const dy = (e.clientY - dragStart.clientY) / safeZoom;

        const newX = Math.round(dragStart.nodeX + dx);
        const newY = Math.round(dragStart.nodeY + dy);

        updateFlowWithDraft((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === draggingNodeId
              ? {
                  ...n,
                  position: {
                    x: Number.isFinite(newX) ? newX : n.position.x,
                    y: Number.isFinite(newY) ? newY : n.position.y
                  }
                }
              : n
          )
        }));
      } else if (activeConn) {
        // Actualizar la punta del cable arrastrado en tiempo real
        const mouseCanvas = screenToCanvasCoords(e.clientX, e.clientY);
        setConnectingState({
          ...activeConn,
          currentMousePos: mouseCanvas
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      stateRef.current.isPanning = false;
      stateRef.current.draggingNodeId = null;

      const activeConn = stateRef.current.connectingState;
      if (activeConn) {
        // Si el usuario soltó el mouse sobre un nodo de destino o su puerto
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const nodeEl = targetEl?.closest('[id^="flow-node-"]') as HTMLElement | null;
        if (nodeEl) {
          const targetNodeId = nodeEl.id.replace('flow-node-', '');
          if (targetNodeId && targetNodeId !== activeConn.sourceNodeId) {
            handleEndConnection(targetNodeId);
            return;
          }
        }
        setConnectingState(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleEndConnection, screenToCanvasCoords, updateFlowWithDraft]);

  // Global Keyboard Shortcuts (Escape to cancel drag, Delete/Supr to delete selected item)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const path = e.composedPath ? e.composedPath() : [e.target];
      const actualTarget = path[0] as HTMLElement;
      const tag = actualTarget?.tagName?.toLowerCase();

      if (
        tag === 'input' ||
        tag === 'textarea' ||
        actualTarget?.isContentEditable ||
        actualTarget?.closest?.('input, textarea, form, [contenteditable="true"]') ||
        editingNode !== null
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (stateRef.current.connectingState) {
          setConnectingState(null);
          stateRef.current.connectingState = null;
        }
        setSelectedConnectionId(null);
        setSelectedNodeId(null);
        setEditingNode(null);
      } else if (e.key === 'Delete') {
        if (selectedConnectionId) {
          handleDeleteConnection(selectedConnectionId);
          setSelectedConnectionId(null);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
          setSelectedNodeId(null);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedConnectionId, selectedNodeId, editingNode]);

  // Start Connection
  const handleStartConnection = (sourceNodeId: string, sourcePortId?: string, e?: React.MouseEvent) => {
    if (!e) return;
    const canvasPos = screenToCanvasCoords(e.clientX, e.clientY);
    const newConnState = {
      sourceNodeId,
      sourcePortId,
      currentMousePos: canvasPos
    };
    stateRef.current.connectingState = newConnState;
    setConnectingState(newConnState);
  };

  // Native non-passive Wheel listener to 100% prevent Chrome page zoom (Ctrl+Wheel / Trackpad Pinch)
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const step = -e.deltaY * 0.0008;
      const clampedDelta = Math.max(-0.05, Math.min(0.05, step));
      const currentZoom = stateRef.current.zoom || 1;
      const newZoom = Math.min(Math.max(currentZoom + clampedDelta, 0.4), 2.0);

      if (Math.abs(newZoom - currentZoom) < 0.001) return;

      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentPan = stateRef.current.pan;

      const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
      const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);

      setZoom(Number(newZoom.toFixed(3)));
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    };

    canvasEl.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // Add Block from Palette
  const handleAddBlock = (type: NodeType) => {
    const nextIdx = flow.nodes.length + 1;
    const centerCanvas = screenToCanvasCoords(
      window.innerWidth / 2,
      window.innerHeight / 2
    );

    const newNode: BotFlowNode = {
      id: `node_${type.toLowerCase()}_${Date.now()}`,
      type,
      title: `Bloque ${nextIdx}`,
      position: {
        x: Math.round(centerCanvas.x - 144),
        y: Math.round(centerCanvas.y - 40)
      },
      data: {
        name: `Bloque ${nextIdx}`,
        replyText: type === 'DELAY' ? '' : 'Mensaje configurable del bot...',
        options: type === 'OPTIONS_MENU' ? [{ id: `opt_${Date.now()}_1`, label: '1. Opción A', keyword: '1' }] : undefined,
        delaySeconds: type === 'DELAY' ? 2 : undefined,
        isActive: true
      }
    };

    updateFlowWithDraft((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
  };

  // Handle Drop onto Canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/tactica-flow-block') as NodeType;
    if (!type) return;

    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    const nextIdx = flow.nodes.length + 1;

    const newNode: BotFlowNode = {
      id: `node_${type.toLowerCase()}_${Date.now()}`,
      type,
      title: `Bloque ${nextIdx}`,
      position: {
        x: Math.round(coords.x - 144),
        y: Math.round(coords.y - 30)
      },
      data: {
        name: `Bloque ${nextIdx}`,
        replyText: type === 'DELAY' ? '' : 'Mensaje configurable del bot...',
        options: type === 'OPTIONS_MENU' ? [{ id: `opt_${Date.now()}_1`, label: '1. Opción A', keyword: '1' }] : undefined,
        delaySeconds: type === 'DELAY' ? 2 : undefined,
        isActive: true
      }
    };

    updateFlowWithDraft((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
  };

  // Node Actions
  const handleDeleteNode = (nodeId: string) => {
    updateFlowWithDraft((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      connections: prev.connections.filter(
        (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      )
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (node: BotFlowNode) => {
    const dupId = `node_${node.type.toLowerCase()}_${Date.now()}`;
    const dupNode: BotFlowNode = {
      ...node,
      id: dupId,
      title: `${node.title} (Copia)`,
      position: { x: (node.position.x || 100) + 40, y: (node.position.y || 100) + 40 },
      data: {
        ...node.data,
        name: `${node.data?.name || node.title} (Copia)`
      }
    };
    updateFlowWithDraft((prev) => ({
      ...prev,
      nodes: [...prev.nodes, dupNode]
    }));
    setSelectedNodeId(dupId);
  };

  const handleDeleteConnection = (connectionId: string) => {
    updateFlowWithDraft((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId)
    }));
  };

  const handleSaveNodeProperties = (updatedNode: BotFlowNode) => {
    updateFlowWithDraft((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    }));
    setEditingNode(null);
  };

  const handleSaveFlow = async () => {
    setSaving(true);
    try {
      await onSaveFlow(flow);
      setHasUnsavedChanges(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('[FlowCanvas] Error guardando flujo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseClick = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmModal(true);
    } else {
      onClose();
    }
  };

  const [hoveredConnection, setHoveredConnection] = useState<BotFlowConnection | null>(null);

  const centerNodes = () => {
    setPan({ x: 80, y: 80 });
    setZoom(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-30 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#9e1114] flex items-center justify-center text-white font-bold shadow-md shadow-red-900/20">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Diagramador de Flujos de Bot
              </h2>
              {hasUnsavedChanges ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Cambios sin guardar (copia local protegida)
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado en servidor
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {flow.nodes.length} bloques · {flow.connections.length} conexiones activas
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Probar Flujo
          </button>

          <button
            type="button"
            onClick={handleSaveFlow}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : savedSuccess ? '¡Guardado!' : 'Guardar Flujo'}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={handleCloseClick}
            className="px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </header>

      {/* Main Canvas Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Palette */}
        <FlowPalette onAddBlock={handleAddBlock} />

        {/* Interactive Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 cursor-default"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: `${24 * (zoom || 1)}px ${24 * (zoom || 1)}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Scaled & Translated World Container */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Interactive Node Cards */}
            <div className="pointer-events-auto">
              {flow.nodes.map((node) => (
                <FlowNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  isHoveredByConnection={
                    hoveredConnection?.sourceNodeId === node.id ||
                    hoveredConnection?.targetNodeId === node.id
                  }
                  activeConnecting={connectingState}
                  onSelect={(id) => setSelectedNodeId(id)}
                  onEdit={(n) => setEditingNode(n)}
                  onDelete={handleDeleteNode}
                  onDuplicate={handleDuplicateNode}
                  onStartConnection={handleStartConnection}
                  onEndConnection={handleEndConnection}
                  onMouseDownDrag={handleNodeMouseDown}
                />
              ))}
            </div>

            {/* SVG Cable Edge Layer - RENDERIZADO POR ENCIMA */}
            <FlowEdgeLayer
              nodes={flow.nodes}
              connections={flow.connections}
              selectedConnectionId={selectedConnectionId}
              onSelectConnection={(id) => {
                setSelectedConnectionId(id);
                if (id) setSelectedNodeId(null);
              }}
              onDeleteConnection={handleDeleteConnection}
              onHoverConnection={(c) => setHoveredConnection(c)}
              activeConnecting={connectingState}
            />
          </div>

          {/* Floating Zoom & Canvas Controls */}
          <div className="absolute bottom-5 left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-lg flex items-center gap-1 z-30 select-none">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
              title="Acercar (Zoom In)"
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 px-1.5 w-11 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
              title="Alejar (Zoom Out)"
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={centerNodes}
              title="Centrar Nodos en Pantalla"
              className="flex items-center gap-1 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs font-semibold"
            >
              <Focus className="w-4 h-4" /> Centrar
            </button>
          </div>
        </div>

        {/* Right Node Properties Drawer */}
        {editingNode && (
          <NodeConfigDrawer
            node={editingNode}
            allNodes={flow.nodes}
            onClose={() => setEditingNode(null)}
            onSave={handleSaveNodeProperties}
          />
        )}
      </div>

      {/* Live WhatsApp Simulator Modal */}
      {showSimulator && (
        <FlowSimulatorModal
          flow={flow}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* Modal de Confirmación al Cerrar con Cambios sin Guardar */}
      {showCloseConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  ¿Guardar cambios antes de salir?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tienes modificaciones sin guardar en el diagrama de flujo.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Si recargas la página o sales sin guardar, puedes perder los bloques o conexiones que agregaste.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await handleSaveFlow();
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Guardar Cambios y Salir
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('tactica_flow_draft');
                  } catch (e) {}
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Descartar Cambios y Salir
              </button>

              <button
                type="button"
                onClick={() => setShowCloseConfirmModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancelar y Seguir Editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
