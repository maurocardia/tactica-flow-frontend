// src/types/flowMedia.ts
// Adjuntos multimedia subidos para nodos de flujo (Enviar Imagen/Video/Audio/Documento) — ver
// FlowNodeMedia en types/bot.ts para cómo un nodo referencia uno de estos por `assetId`.

export interface FlowMediaAsset {
  id: number;
  kind: 'image' | 'video' | 'audio' | 'document';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
