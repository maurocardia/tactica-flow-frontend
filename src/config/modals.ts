// Identificadores de todos los modales del panel. ModalHost hace un switch sobre esto y nunca
// monta más de uno a la vez.
export type ModalId =
  | 'config'
  | 'ai-summary'
  | 'knowledge-base'
  | 'campaigns'
  | 'templates'
  | 'scheduled'
  | 'incoming-leads'
  | 'tag-group'
  | 'save-history'
  | 'schedule-activity'
  | 'quick-task'
  | 'generate-document'
  | 'reassign'
  | 'go-to-record'
  | 'dialer'
  | 'google-oauth'
  | 'linkedin-connect'
  | 'schedule-message'
  | 'sequence-editor';
