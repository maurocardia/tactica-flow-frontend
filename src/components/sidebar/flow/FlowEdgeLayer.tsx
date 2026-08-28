// src/components/sidebar/flow/FlowEdgeLayer.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BotFlowConnection, BotFlowNode } from '@/types/bot';

interface FlowEdgeLayerProps {
  nodes: BotFlowNode[];
  connections: BotFlowConnection[];
  onDeleteConnection: (connectionId: string) => void;
  hoveredNodeId?: string | null;
  onHoverConnection?: (connection: BotFlowConnection | null) => void;
  activeConnecting?: {
    sourceNodeId: string;
    sourcePortId?: string;
    currentMousePos: { x: number; y: number };
  } | null;
}

export const FlowEdgeLayer: React.FC<FlowEdgeLayerProps> = ({
  nodes,
  connections,
  onDeleteConnection,
  hoveredNodeId,
  onHoverConnection,
  activeConnecting
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const getNodeCenterCoords = (node: BotFlowNode, portId?: string, isInput = false) => {
    const nodeWidth = 288;
    const posX = Number.isFinite(node?.position?.x) ? node.position.x : 100;
    const posY = Number.isFinite(node?.position?.y) ? node.position.y : 100;

    // Medir la altura real del nodo en el DOM si está disponible
    const cardEl = typeof document !== 'undefined' ? document.getElementById(`flow-node-${node.id}`) : null;
    const renderedHeight = cardEl ? cardEl.offsetHeight : 175;

    if (isInput) {
      // Puerto de entrada: exactamente en el centro del círculo superior (-top-3.5)
      return {
        x: posX + nodeWidth / 2,
        y: posY - 2,
        isRightPort: false
      };
    }

    // Puerto de salida por opción (a la derecha):
    if (portId && portId !== 'default' && node.data?.options) {
      const portEl = typeof document !== 'undefined' ? document.getElementById(`port-out-${node.id}-${portId}`) : null;
      if (portEl && cardEl) {
        const cardRect = cardEl.getBoundingClientRect();
        const portRect = portEl.getBoundingClientRect();
        const relativeY = (portRect.top - cardRect.top) + portRect.height / 2;
        return {
          x: posX + nodeWidth,
          y: posY + relativeY,
          isRightPort: true
        };
      }
      const optIdx = node.data.options.findIndex((o, i) => (o.id || `opt_${i}`) === portId);
      if (optIdx !== -1) {
        const headerH = 42;
        const optionsStart = headerH + 60;
        return {
          x: posX + nodeWidth,
          y: posY + optionsStart + optIdx * 36 + 18,
          isRightPort: true
        };
      }
    }

    // Puerto de salida default: exactamente en el centro del círculo inferior (-bottom-3.5)
    return {
      x: posX + nodeWidth / 2,
      y: posY + renderedHeight + 2,
      isRightPort: false
    };
  };

  const getBezierPath = (x1: number, y1: number, x2: number, y2: number, isRightPort = false) => {
    const validX1 = Number.isFinite(x1) ? x1 : 100;
    const validY1 = Number.isFinite(y1) ? y1 : 100;
    const validX2 = Number.isFinite(x2) ? x2 : 200;
    const validY2 = Number.isFinite(y2) ? y2 : 200;

    const deltaY = validY2 - validY1;
    const deltaX = validX2 - validX1;

    let cx1: number, cy1: number, cx2: number, cy2: number;

    if (isRightPort) {
      // Sale horizontal hacia la derecha desde el botón de la opción
      const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY), 60);
      cx1 = validX1 + distance * 0.4;
      cy1 = validY1;
      cx2 = validX2;
      cy2 = validY2 - Math.max(distance * 0.4, 45);
    } else if (deltaY > 20) {
      // Destino está claramente abajo: curva Bézier suave vertical
      const dy = Math.max(deltaY * 0.5, 45);
      cx1 = validX1;
      cy1 = validY1 + dy;
      cx2 = validX2;
      cy2 = validY2 - dy;
    } else {
      // Destino está al lado o arriba: el cable sale hacia abajo y sube arqueándose
      const arc = Math.max(Math.abs(deltaX) * 0.35, 65);
      cx1 = validX1;
      cy1 = validY1 + arc;
      cx2 = validX2;
      cy2 = validY2 - arc;
    }

    return `M ${validX1} ${validY1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${validX2} ${validY2}`;
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
      <defs>
        {/* Marcador de Flecha Normal (Rojo Táctica semi-transparente) */}
        <marker
          id="flow-arrow-red-default"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#b81519" opacity="0.6" />
        </marker>

        {/* Marcador de Flecha Hover / Activo (Rojo Brillante Sólido) */}
        <marker
          id="flow-arrow-red-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ef4444" />
        </marker>

        {/* Gradiente Rojo Táctica por defecto (Sutil y elegante) */}
        <linearGradient id="edge-gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9e1114" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.55" />
        </linearGradient>

        {/* Gradiente Rojo Intenso para Hover (Brillante) */}
        <linearGradient id="edge-gradient-hover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b81519" />
          <stop offset="100%" stopColor="#ff2e35" />
        </linearGradient>

        {/* Filtro de Resplandor Glow para hover */}
        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Conexiones Existentes */}
      {connections.map((conn) => {
        const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
        const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
        if (!sourceNode || !targetNode) return null;

        const start = getNodeCenterCoords(sourceNode, conn.sourcePortId, false);
        const end = getNodeCenterCoords(targetNode, undefined, true);
        const pathData = getBezierPath(start.x, start.y, end.x, end.y, start.isRightPort);

        // Punto medio para el botón de eliminar
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const isHovered = hoveredEdgeId === conn.id;
        const isNodeRelated = hoveredNodeId === conn.sourceNodeId || hoveredNodeId === conn.targetNodeId;
        const isHighlighted = isHovered || isNodeRelated;

        return (
          <g
            key={conn.id}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => {
              setHoveredEdgeId(conn.id);
              onHoverConnection?.(conn);
            }}
            onMouseLeave={() => {
              setHoveredEdgeId(null);
              onHoverConnection?.(null);
            }}
          >
            {/* Cable de interacción grueso transparente para facilitar hover y clic */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="24"
            />

            {/* Cable visual de resplandor cuando está en hover */}
            {isHighlighted && (
              <path
                d={pathData}
                fill="none"
                stroke="#ef4444"
                strokeWidth="7"
                strokeOpacity="0.35"
                filter="url(#glow-red)"
              />
            )}

            {/* Cable visual principal (Rojo semi-transparente por defecto, brillante en hover) */}
            <path
              d={pathData}
              fill="none"
              stroke={isHighlighted ? 'url(#edge-gradient-hover)' : 'url(#edge-gradient-red)'}
              strokeWidth={isHighlighted ? '3.5' : '2.5'}
              strokeDasharray={isHighlighted ? '6 3' : undefined}
              markerEnd={isHighlighted ? 'url(#flow-arrow-red-active)' : 'url(#flow-arrow-red-default)'}
              className="transition-all duration-150"
            />

            {/* Indicador de nodo de salida y entrada iluminados en hover */}
            {isHighlighted && (
              <>
                <circle cx={start.x} cy={start.y} r="5" fill="#ef4444" className="animate-ping" opacity="0.75" />
                <circle cx={start.x} cy={start.y} r="4" fill="#b81519" />
                <circle cx={end.x} cy={end.y} r="4" fill="#ef4444" />
              </>
            )}

            {/* Botón flotante para borrar conexión al hacer hover */}
            {isHovered && (
              <g
                transform={`translate(${midX - 13}, ${midY - 13})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConnection(conn.id);
                }}
                className="cursor-pointer group"
              >
                <circle cx="13" cy="13" r="13" fill="#dc2626" className="shadow-lg hover:fill-red-700 transition-colors" />
                <X x="6.5" y="6.5" width="13" height="13" stroke="white" strokeWidth="2.5" />
              </g>
            )}
          </g>
        );
      })}

      {/* Cable dinámico mientras se arrastra una nueva conexión */}
      {activeConnecting && (() => {
        const sourceNode = nodes.find((n) => n.id === activeConnecting.sourceNodeId);
        if (!sourceNode) return null;
        const start = getNodeCenterCoords(sourceNode, activeConnecting.sourcePortId, false);
        const end = activeConnecting.currentMousePos;
        const pathData = getBezierPath(start.x, start.y, end.x, end.y, start.isRightPort);

        return (
          <g>
            <path
              d={pathData}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              markerEnd="url(#flow-arrow-red-active)"
              filter="url(#glow-red)"
              className="animate-pulse"
            />
            <circle cx={end.x} cy={end.y} r="6" fill="#ef4444" />
          </g>
        );
      })()}
    </svg>
  );
};
