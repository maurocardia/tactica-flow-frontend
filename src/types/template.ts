export type TemplateKind = 'fijo' | 'ia';

export interface MessageTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  text: string;
}
