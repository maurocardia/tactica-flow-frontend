import { ChannelId } from '@/types/account';
import { LeadSourceId } from '@/types/campaign';

export interface SourceFilterDef {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
}

export interface MockResult {
  name: string;
  company?: string;
  channels: ChannelId[];
}

export interface SourceDef {
  id: LeadSourceId;
  label: string;
  description: string;
  icon: string;
  color: string;
  filters: SourceFilterDef[];
  results: MockResult[];
  isCsv?: boolean;
}

export const SOURCES: SourceDef[] = [
  {
    id: 'linkedin-search',
    label: 'LinkedIn · Búsqueda',
    description: 'Buscar prospectos por palabra clave, cargo o industria.',
    icon: 'in',
    color: 'bg-blue-50 text-blue-700',
    filters: [
      { key: 'keyword', label: 'Palabra clave', type: 'text' },
      { key: 'grado', label: 'Grado', type: 'select', options: ['1º', '2º', '3º'] },
      { key: 'pais', label: 'País', type: 'text' },
      { key: 'empresa', label: 'Empresa', type: 'text' },
    ],
    results: [
      { name: 'Martín Suárez', company: 'Suárez Hnos. SRL', channels: ['li'] },
      { name: 'Rocío Fernández', company: 'Fernández & Asoc.', channels: ['li'] },
      { name: 'Diego Ibáñez', company: 'Ibáñez Logística', channels: ['li'] },
    ],
  },
  {
    id: 'linkedin-network',
    label: 'LinkedIn · Mi red',
    description: 'Contactos de primer grado ya conectados.',
    icon: 'in',
    color: 'bg-blue-50 text-blue-700',
    filters: [{ key: 'keyword', label: 'Filtrar por nombre o empresa', type: 'text' }],
    results: [
      { name: 'Valeria Torres', company: 'Torres Insumos', channels: ['li', 'wa'] },
      { name: 'Nicolás Paz', company: 'Paz Construcciones', channels: ['li'] },
    ],
  },
  {
    id: 'sales-navigator',
    label: 'Sales Navigator',
    description: 'Búsqueda avanzada con filtros de tamaño de empresa e intención de compra.',
    icon: 'in',
    color: 'bg-blue-50 text-blue-700',
    filters: [
      { key: 'tamano', label: 'Tamaño empresa', type: 'select', options: ['1-10', '11-50', '51-200', '200+'] },
      { key: 'relacion', label: 'Relación', type: 'select', options: ['1º', '2º', 'Grupo compartido'] },
      { key: 'intent', label: 'Buyer intent', type: 'select', options: ['Alto', 'Medio', 'Bajo'] },
    ],
    results: [
      { name: 'Sofía Lombardi', company: 'Lombardi Textil SA', channels: ['li'] },
      { name: 'Ezequiel Molina', company: 'Molina Group', channels: ['li'] },
    ],
  },
  {
    id: 'google-contacts',
    label: 'Google Contacts',
    description: 'Contactos importados desde tu cuenta de Google.',
    icon: 'gm',
    color: 'bg-red-50 text-red-700',
    filters: [
      { key: 'buscar', label: 'Buscar', type: 'text' },
      { key: 'etiqueta', label: 'Etiqueta', type: 'text' },
    ],
    results: [
      { name: 'Carla Domínguez', company: 'Domínguez Consultora', channels: ['gm'] },
      { name: 'Pablo Ayala', company: '', channels: ['gm', 'wa'] },
    ],
  },
  {
    id: 'whatsapp-groups',
    label: 'WhatsApp · Grupos',
    description: 'Miembros de grupos donde participa la cuenta conectada.',
    icon: 'wa',
    color: 'bg-emerald-50 text-emerald-700',
    filters: [{ key: 'grupo', label: 'Grupo', type: 'select', options: ['Grupo · Compras', 'Grupo · Soporte VIP'] }],
    results: [
      { name: 'Juan Pérez', channels: ['wa'] },
      { name: 'María Gómez', channels: ['wa'] },
    ],
  },
  {
    id: 'csv',
    label: 'Importar CSV / Excel',
    description: 'Pegar o subir una lista de contactos.',
    icon: 'csv',
    color: 'bg-slate-100 text-slate-700',
    filters: [],
    results: [],
    isCsv: true,
  },
  {
    id: 'tactica',
    label: 'Contactos de TACTICA',
    description: 'Filtros y listas ya guardadas en TACTICA.',
    icon: 'tac',
    color: 'bg-red-50 text-red-800',
    filters: [
      { key: 'filtro', label: 'Filtro guardado', type: 'select', options: ['Clientes activos', 'Presupuestos pendientes'] },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['Cliente', 'Prospecto'] },
    ],
    results: [
      { name: 'Lucía Ferreyra', company: 'Ferreyra e Hijos', channels: ['wa', 'gm'] },
      { name: 'Andrés Kessler', company: 'Kessler Import', channels: ['wa'] },
    ],
  },
];
