// src/components/sidebar/flow/nodeDefaults.ts
// Fábrica de nodos nuevos, compartida por FlowCanvas.handleAddBlock (clic en la paleta) y
// handleDrop (arrastrar y soltar) — antes estaba duplicada literalmente en los dos lugares, algo
// que se vuelve insostenible con 13 tipos de bloque en vez de 6.
import { BotFlowNode, FlowNodeOption, NodeType } from '@/types/bot';

export function createDefaultNode(type: NodeType, position: { x: number; y: number }, index: number): BotFlowNode {
  const id = `node_${type.toLowerCase()}_${Date.now()}`;
  const name = `Bloque ${index}`;

  const node: BotFlowNode = {
    id,
    type,
    title: name,
    position,
    data: {
      name,
      replyText: type === 'DELAY' ? '' : 'Mensaje configurable del bot...',
      isActive: true
    }
  };

  switch (type) {
    case 'OPTIONS_MENU':
    case 'BUTTONS_REPLY': {
      const opt: FlowNodeOption = { id: `opt_${Date.now()}_1`, label: '1. Opción A', keyword: '1', targetNodeId: null };
      node.data.options = [opt];
      break;
    }
    case 'LIST_MESSAGE': {
      const opt: FlowNodeOption = { id: `opt_${Date.now()}_1`, label: 'Opción A', keyword: '1', description: '', targetNodeId: null };
      node.data.options = [opt];
      node.data.listButtonText = 'Ver opciones';
      break;
    }
    case 'DELAY':
      node.data.delaySeconds = 2;
      node.data.replyText = '';
      break;
    case 'SEND_IMAGE':
      node.data.media = { kind: 'image', source: 'url' };
      node.data.replyText = '';
      break;
    case 'SEND_VIDEO':
      node.data.media = { kind: 'video', source: 'url' };
      node.data.replyText = '';
      break;
    case 'SEND_AUDIO':
      node.data.media = { kind: 'audio', source: 'url' };
      node.data.replyText = '';
      break;
    case 'SEND_DOCUMENT':
      node.data.media = { kind: 'document', source: 'url' };
      node.data.replyText = '';
      break;
    case 'HANDOFF':
      node.data.advisorMode = 'auto';
      node.data.advisorId = null;
      node.data.replyText = 'Te estamos transfiriendo con un asesor de nuestro equipo. En instantes te responderán por este chat.';
      break;
    case 'FINISH_FLOW':
      node.data.replyText = 'Gracias por comunicarte con nosotros. ¡Que tengas un excelente día!';
      break;
    default:
      break;
  }

  return node;
}
