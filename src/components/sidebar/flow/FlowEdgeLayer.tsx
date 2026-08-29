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

interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Genera un trazado SVG ortogonal (Manhattan / Step) con esquinas redondeadas suaves (12px)
 */
function generateRoundedStepPath(points: Point[], cornerRadius = 12): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Filtrar puntos duplicados consecutivos
  const cleanPoints: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = points[i];
    if (Math.abs(prev.x - curr.x) > 0.5 || Math.abs(prev.y - curr.y) > 0.5) {
      cleanPoints.push(curr);
    }
  }

  if (cleanPoints.length <= 2) {
    return `M ${cleanPoints[0].x} ${cleanPoints[0].y} L ${cleanPoints[cleanPoints.length - 1].x} ${cleanPoints[cleanPoints.length - 1].y}`;
  }

  let d = `M ${cleanPoints[0].x} ${cleanPoints[0].y}`;

  for (let i = 1; i < cleanPoints.length - 1; i++) {
    const p0 = cleanPoints[i - 1];
    const p1 = cleanPoints[i];
    const p2 = cleanPoints[i + 1];

    const d1x = p1.x - p0.x;
    const d1y = p1.y - p0.y;
    const len1 = Math.hypot(d1x, d1y);

    const d2x = p2.x - p1.x;
    const d2y = p2.y - p1.y;
    const len2 = Math.hypot(d2x, d2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r <= 1 || len1 === 0 || len2 === 0) {
      d += ` L ${p1.x} ${p1.y}`;
      continue;
    }

    // Punto antes de la esquina
    const startX = p1.x - (d1x / len1) * r;
    const startY = p1.y - (d1y / len1) * r;

    // Punto después de la esquina
    const endX = p1.x + (d2x / len2) * r;
    const endY = p1.y + (d2y / len2) * r;

    d += ` L ${startX} ${startY} Q ${p1.x} ${p1.y} ${endX} ${endY}`;
  }

  const last = cleanPoints[cleanPoints.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
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

  /**
   * Generador de caminos ortogonales con esquiva inteligente de tarjetas intermedias (Obstacle Avoidance)
   */
  const getStepPath = (
    start: { x: number; y: number; isRightPort?: boolean },
    end: { x: number; y: number },
    sourceNodeId?: string,
    targetNodeId?: string
  ) => {
    const x1 = Number.isFinite(start.x) ? Math.round(start.x) : 100;
    const y1 = Number.isFinite(start.y) ? Math.round(start.y) : 100;
    const x2 = Number.isFinite(end.x) ? Math.round(end.x) : 200;
    const y2 = Number.isFinite(end.y) ? Math.round(end.y) : 200;
    const isRightPort = !!start.isRightPort;

    const deltaY = y2 - y1;
    const deltaX = x2 - x1;

    // Obtener las cajas delimitadoras de los demás nodos (obstáculos)
    const obstacleBoxes: Box[] = nodes
      .filter((n) => n.id !== sourceNodeId && n.id !== targetNodeId)
      .map((n) => {
        const cardEl = typeof document !== 'undefined' ? document.getElementById(`flow-node-${n.id}`) : null;
        const h = cardEl ? cardEl.offsetHeight : 175;
        const pad = 16;
        return {
          left: (n.position?.x || 0) - pad,
          right: (n.position?.x || 0) + 288 + pad,
          top: (n.position?.y || 0) - pad,
          bottom: (n.position?.y || 0) + h + pad
        };
      });

    // Caso 1: Salida desde la derecha (opción de menú)
    if (isRightPort) {
      const exitCorridorX = x1 + 28;
      if (deltaX >= 40 && deltaY >= 20) {
        const midY = Math.round(y1 + Math.max(deltaY / 2, 20));
        return generateRoundedStepPath([
          { x: x1, y: y1 },
          { x: exitCorridorX, y: y1 },
          { x: exitCorridorX, y: midY },
          { x: x2, y: midY },
          { x: x2, y: y2 }
        ], 10);
      } else {
        const entryCorridorY = y2 - 28;
        return generateRoundedStepPath([
          { x: x1, y: y1 },
          { x: exitCorridorX, y: y1 },
          { x: exitCorridorX, y: entryCorridorY },
          { x: x2, y: entryCorridorY },
          { x: x2, y: y2 }
        ], 10);
      }
    }

    // Verificar si hay algún nodo obstáculo en el trayecto vertical directo
    const minX = Math.min(x1, x2) - 10;
    const maxX = Math.max(x1, x2) + 10;
    const minY = Math.min(y1, y2) + 10;
    const maxY = Math.max(y1, y2) - 10;

    const blockingObstacles = obstacleBoxes.filter(
      (b) => !(b.right < minX || b.left > maxX || b.bottom < minY || b.top > maxY)
    );

    // Caso 2: Hay tarjetas intermedias en medio (ej: de fila 1 a fila 3 en la misma columna)
    if (blockingObstacles.length > 0) {
      // Encontrar el borde derecho más lejano de todos los obstáculos para bordear por la avenida
      const maxObstacleRight = Math.max(...blockingObstacles.map((b) => b.right), x1 + 144 + 20);
      const avenueX = maxObstacleRight + 12;
      const exitY = y1 + 24;
      const entryY = y2 - 24;

      return generateRoundedStepPath([
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: avenueX, y: exitY },
        { x: avenueX, y: entryY },
        { x: x2, y: entryY },
        { x: x2, y: y2 }
      ], 12);
    }

    // Caso 3: Destino está justo abajo sin obstáculos en medio
    if (Math.abs(deltaX) < 10 && deltaY >= 20) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    // Caso 4: Destino está abajo (deltaY >= 40) en otra columna sin obstáculos intermedios
    if (deltaY >= 40) {
      const midY = Math.round(y1 + deltaY / 2);
      return generateRoundedStepPath([
        { x: x1, y: y1 },
        { x: x1, y: midY },
        { x: x2, y: midY },
        { x: x2, y: y2 }
      ], 12);
    }

    // Caso 5: Destino está en la misma fila, arriba o al lado (deltaY < 40)
    const exitY = y1 + 28;
    const entryY = y2 - 28;

    let verticalCorridorX = Math.round((x1 + x2) / 2);
    if (Math.abs(deltaX) < 60) {
      verticalCorridorX = x1 + 170;
    }

    return generateRoundedStepPath([
      { x: x1, y: y1 },
      { x: x1, y: exitY },
      { x: verticalCorridorX, y: exitY },
      { x: verticalCorridorX, y: entryY },
      { x: x2, y: entryY },
      { x: x2, y: y2 }
    ], 12);
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
        const pathData = getStepPath(start, end, sourceNode.id, targetNode.id);

        // Punto medio aproximado para el botón de eliminar
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

            {/* Cable visual principal (Líneas rectas ortogonales con esquinas redondeadas) */}
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
        const pathData = getStepPath(start, end, sourceNode.id);

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
