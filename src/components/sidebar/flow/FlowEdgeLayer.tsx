// src/components/sidebar/flow/FlowEdgeLayer.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BotFlowConnection, BotFlowNode } from '@/types/bot';

interface FlowEdgeLayerProps {
  nodes: BotFlowNode[];
  connections: BotFlowConnection[];
  onDeleteConnection: (connectionId: string) => void;
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
  activeConnecting
}) => {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const getNodeCenterCoords = (node: BotFlowNode, portId?: string, isInput = false) => {
    const nodeWidth = 288; // w-72 = 18rem = 288px
    // Estimación de altura o cálculo de offset según el tipo
    const baseHeight = 120;

    if (isInput) {
      // Puerto de entrada: parte superior central
      return {
        x: node.position.x + nodeWidth / 2,
        y: node.position.y
      };
    }

    // Puerto de salida:
    if (portId && portId !== 'default' && node.data.options) {
      // Buscar índice de la opción
      const optIdx = node.data.options.findIndex((o, i) => (o.id || `opt_${i}`) === portId);
      if (optIdx !== -1) {
        // Handle a la derecha del ítem de la opción
        const headerH = 40;
        const optionsStart = headerH + 60; // offset aproximado
        return {
          x: node.position.x + nodeWidth,
          y: node.position.y + optionsStart + optIdx * 36 + 18
        };
      }
    }

    // Puerto de salida default: parte inferior central
    return {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + baseHeight
    };
  };

  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = Math.max(Math.abs(y2 - y1) * 0.5, 40);
    const dx = (x2 - x1) * 0.2;
    const cx1 = x1 + dx;
    const cy1 = y1 + dy;
    const cx2 = x2 - dx;
    const cy2 = y2 - dy;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
      <defs>
        {/* Marcador de Flecha */}
        <marker
          id="flow-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" />
        </marker>

        <marker
          id="flow-arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>

        {/* Gradiente para los cables */}
        <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Conexiones Existentes */}
      {connections.map((conn) => {
        const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
        const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
        if (!sourceNode || !targetNode) return null;

        const start = getNodeCenterCoords(sourceNode, conn.sourcePortId, false);
        const end = getNodeCenterCoords(targetNode, undefined, true);
        const pathData = getBezierPath(start.x, start.y, end.x, end.y);

        // Punto medio para el botón de eliminar
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const isHovered = hoveredEdge === conn.id;

        return (
          <g
            key={conn.id}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setHoveredEdge(conn.id)}
            onMouseLeave={() => setHoveredEdge(null)}
          >
            {/* Cable de interacción grueso transparente para facilitar hover */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
            />

            {/* Cable visual principal */}
            <path
              d={pathData}
              fill="none"
              stroke={isHovered ? '#ef4444' : 'url(#edge-gradient)'}
              strokeWidth={isHovered ? '3.5' : '2.5'}
              strokeDasharray={isHovered ? '4 2' : undefined}
              markerEnd="url(#flow-arrow)"
              className="transition-all"
            />

            {/* Botón flotante para borrar conexión al hacer hover */}
            {isHovered && (
              <g
                transform={`translate(${midX - 12}, ${midY - 12})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConnection(conn.id);
                }}
                className="cursor-pointer"
              >
                <circle cx="12" cy="12" r="12" fill="#ef4444" className="shadow-md" />
                <X x="6" y="6" width="12" height="12" stroke="white" strokeWidth="2.5" />
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
        const pathData = getBezierPath(start.x, start.y, end.x, end.y);

        return (
          <g>
            <path
              d={pathData}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="6 4"
              markerEnd="url(#flow-arrow-active)"
              className="animate-pulse"
            />
            <circle cx={end.x} cy={end.y} r="5" fill="#10b981" />
          </g>
        );
      })()}
    </svg>
  );
};
