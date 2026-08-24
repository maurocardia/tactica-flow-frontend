// Espejo de los tipos reales del backend (tactica-flow-backend/src/services/knowledgeBase.service.ts).
// A diferencia del resto de types/*.ts (prototipo visual), esto respalda datos que vienen de verdad
// de /api/knowledge-bases.

export interface KnowledgeBase {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface KnowledgeBaseInput {
  title: string;
  description?: string;
  isActive?: boolean;
}

export interface KnowledgeDocument {
  id: number;
  knowledgeBaseId: number;
  filename: string;
  mimeType: string;
  charCount: number;
  preview: string;
  createdAt: string;
}
