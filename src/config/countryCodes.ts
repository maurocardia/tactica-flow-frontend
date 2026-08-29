// Lista de países para el selector de "Agregar por número" del panel "Bot habilitado por
// contacto" — mismos códigos que la tabla de validación de DOMService (dom.service.ts,
// COUNTRY_CODE_LENGTHS), pero acá con nombre y bandera para mostrar en el dropdown.
export interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '57', name: 'Colombia', flag: '🇨🇴' },
  { code: '54', name: 'Argentina', flag: '🇦🇷' },
  { code: '52', name: 'México', flag: '🇲🇽' },
  { code: '55', name: 'Brasil', flag: '🇧🇷' },
  { code: '56', name: 'Chile', flag: '🇨🇱' },
  { code: '58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '51', name: 'Perú', flag: '🇵🇪' },
  { code: '593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '507', name: 'Panamá', flag: '🇵🇦' },
  { code: '506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '504', name: 'Honduras', flag: '🇭🇳' },
  { code: '505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '1', name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '34', name: 'España', flag: '🇪🇸' },
  { code: '44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '33', name: 'Francia', flag: '🇫🇷' },
  { code: '49', name: 'Alemania', flag: '🇩🇪' },
  { code: '39', name: 'Italia', flag: '🇮🇹' },
  { code: '91', name: 'India', flag: '🇮🇳' },
  { code: '27', name: 'Sudáfrica', flag: '🇿🇦' },
];
