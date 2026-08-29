// src/components/sidebar/flow/FlowCanvas.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Focus
} from 'lucide-react';
import {
  BotFlowData,
  BotFlowNode,
  BotFlowConnection,
  NodeType
} from '@/types/bot';
import { FlowPalette } from './FlowPalette';
import { FlowNodeCard } from './FlowNodeCard';
import { FlowEdgeLayer } from './FlowEdgeLayer';
import { NodeConfigDrawer } from './NodeConfigDrawer';
import { FlowSimulatorModal } from './FlowSimulatorModal';

interface FlowCanvasProps {
  initialData?: BotFlowData;
  onSaveFlow: (data: BotFlowData) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_INITIAL_FLOW: BotFlowData = {
  id: 'main_flow',
  name: 'Flujo Principal de Atención',
  nodes: [
    {
      id: 'node_trigger_1',
      type: 'TRIGGER',
      title: 'Disparador Principal',
      position: { x: 80, y: 150 },
      data: {
        name: 'Palabras de Bienvenida',
        keywords: ['hola', 'buen dia', 'buenas tardes', 'info', 'consulta', 'empezar'],
        isActive: true
      }
    },
    {
      id: 'node_menu_1',
      type: 'OPTIONS_MENU',
      title: 'Menú Inicial',
      position: { x: 440, y: 120 },
      data: {
        name: 'Opciones de Atención',
        replyText: '¡Hola {nombre}! 👋 Gracias por comunicarte con nuestro equipo comercial.\n\nPor favor elige una opción:',
        options: [
          { id: 'opt_1', label: 'Consultar Lista de Precios', keyword: '1' },
          { id: 'opt_2', label: 'Consultar Estado de Pedido', keyword: '2' },
          { id: 'opt_3', label: 'Hablar con un Asesor', keyword: '3' }
        ]
      }
    },
    {
      id: 'node_reply_prices',
      type: 'STATIC_REPLY',
      title: 'Respuesta Precios',
      position: { x: 820, y: 40 },
      data: {
        name: 'Información de Precios',
        replyText: 'Nuestra lista de precios oficial se encuentra actualizada. Puedes descargarla o consultarnos por un presupuesto personalizado para tu empresa.'
      }
    },
    {
      id: 'node_ai_agent',
      type: 'CALL_AI',
      title: 'Consultas Generales',
      position: { x: 820, y: 220 },
      data: {
        name: 'Asistente Inteligente',
        replyText: 'Procesando tu consulta técnica o comercial con la Base de Conocimiento...'
      }
    },
    {
      id: 'node_handoff',
      type: 'HANDOFF',
      title: 'Derivación Comercial',
      position: { x: 820, y: 400 },
      data: {
        name: 'Transferir a Asesor',
        replyText: 'Te transferimos con un asesor de ventas en vivo. En instantes te responderán por este chat.'
      }
    }
  ],
  connections: [
    { id: 'conn_1', sourceNodeId: 'node_trigger_1', sourcePortId: 'default', targetNodeId: 'node_menu_1' },
    { id: 'conn_2', sourceNodeId: 'node_menu_1', sourcePortId: 'opt_1', targetNodeId: 'node_reply_prices' },
    { id: 'conn_3', sourceNodeId: 'node_menu_1', sourcePortId: 'opt_2', targetNodeId: 'node_ai_agent' },
    { id: 'conn_4', sourceNodeId: 'node_menu_1', sourcePortId: 'opt_3', targetNodeId: 'node_handoff' }
  ]
};

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  initialData,
  onSaveFlow,
  onClose
}) => {
  const [flow, setFlow] = useState<BotFlowData>(() => {
    const raw = initialData?.nodes?.length ? initialData : DEFAULT_INITIAL_FLOW;
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

    setFlow((prev) => {
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
  }, []);

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

        setFlow((prev) => ({
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
  }, [handleEndConnection, screenToCanvasCoords]);

  // Global Keyboard Shortcuts (Escape to cancel drag, Delete/Backspace to delete selected item)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === 'Escape') {
        if (stateRef.current.connectingState) {
          setConnectingState(null);
          stateRef.current.connectingState = null;
        }
        setSelectedConnectionId(null);
        setSelectedNodeId(null);
        setEditingNode(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
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
  }, [selectedConnectionId, selectedNodeId]);

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

  // Zoom Wheel (Suave y enfocado hacia la posición del cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    // Amortiguación suave para ruedas de mouse y trackpads
    const step = -e.deltaY * 0.0008;
    const clampedDelta = Math.max(-0.05, Math.min(0.05, step));
    const currentZoom = stateRef.current.zoom || 1;
    const newZoom = Math.min(Math.max(currentZoom + clampedDelta, 0.4), 2.0);

    if (Math.abs(newZoom - currentZoom) < 0.001) return;

    // Zoom enfocado en el punto exacto donde apunta el cursor
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const currentPan = stateRef.current.pan;

    const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
    const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);

    setZoom(Number(newZoom.toFixed(3)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

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
      title: `Nuevo Bloque ${nextIdx}`,
      position: {
        x: Math.round(centerCanvas.x - 140),
        y: Math.round(centerCanvas.y - 40)
      },
      data: {
        name: `Bloque ${nextIdx}`,
        replyText: type === 'DELAY' ? '' : 'Mensaje configurable del bot...',
        options: type === 'OPTIONS_MENU' ? [{ id: 'opt_1', label: '1. Opción A', keyword: '1' }] : undefined,
        delaySeconds: type === 'DELAY' ? 2 : undefined,
        isActive: true
      }
    };

    setFlow((prev) => ({
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
        x: Math.round(coords.x - 140),
        y: Math.round(coords.y - 40)
      },
      data: {
        name: `Bloque ${nextIdx}`,
        replyText: type === 'DELAY' ? '' : 'Mensaje configurable del bot...',
        options: type === 'OPTIONS_MENU' ? [{ id: 'opt_1', label: '1. Opción A', keyword: '1' }] : undefined,
        delaySeconds: type === 'DELAY' ? 2 : undefined,
        isActive: true
      }
    };

    setFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
  };

  // Node Actions
  const handleDeleteNode = (nodeId: string) => {
    setFlow((prev) => ({
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
    setFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, dupNode]
    }));
    setSelectedNodeId(dupId);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setFlow((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId)
    }));
  };

  const handleSaveNodeProperties = (updatedNode: BotFlowNode) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    }));
    setEditingNode(null);
  };

  const handleSaveFlow = async () => {
    setSaving(true);
    try {
      await onSaveFlow(flow);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('[FlowCanvas] Error guardando flujo:', err);
    } finally {
      setSaving(false);
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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-[#9e1114] dark:text-red-300 border border-red-200 dark:border-red-800">
                Visual Flow Builder
              </span>
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
            onClick={onClose}
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
          onWheel={handleWheel}
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
    </div>
  );
};
