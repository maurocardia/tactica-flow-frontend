import React from 'react';

// Un <select> nativo no puede renderizar SVG dentro de <option> (los navegadores solo muestran
// texto ahí) — por eso el emoji de bandera se veía como "co" en vez de un ícono en Windows (esa
// fuente no compone los indicadores regionales en una bandera). Esta es una aproximación simple
// de cada bandera (franjas de color, sin escudos/sellos) que sí se puede dibujar como SVG real en
// cualquier sistema operativo, para usar en un dropdown propio en vez del <select> nativo.
type FlagSpec =
  | { kind: 'h'; colors: string[]; weights?: number[] } // franjas horizontales
  | { kind: 'v'; colors: string[]; weights?: number[] } // franjas verticales
  | { kind: 'quad'; colors: [string, string, string, string] }; // 4 cuadrantes (TL, TR, BL, BR)

const FLAGS: Record<string, FlagSpec> = {
  '57': { kind: 'h', colors: ['#FCD116', '#003893', '#CE1126'], weights: [2, 1, 1] }, // Colombia
  '54': { kind: 'h', colors: ['#75AADB', '#FFFFFF', '#75AADB'] }, // Argentina
  '52': { kind: 'v', colors: ['#006847', '#FFFFFF', '#CE1126'] }, // México
  '55': { kind: 'h', colors: ['#009739', '#FEDD00', '#009739'] }, // Brasil (aprox. verde/amarillo)
  '56': { kind: 'quad', colors: ['#0039A6', '#FFFFFF', '#FFFFFF', '#D52B1E'] }, // Chile
  '58': { kind: 'h', colors: ['#FFCC00', '#00247D', '#CF142B'] }, // Venezuela
  '51': { kind: 'v', colors: ['#D91023', '#FFFFFF', '#D91023'] }, // Perú
  '593': { kind: 'h', colors: ['#FFDD00', '#034EA2', '#ED1C24'], weights: [2, 1, 1] }, // Ecuador
  '595': { kind: 'h', colors: ['#D52B1E', '#FFFFFF', '#0038A8'] }, // Paraguay
  '598': { kind: 'h', colors: ['#0038A8', '#FFFFFF', '#0038A8', '#FFFFFF', '#0038A8'] }, // Uruguay
  '591': { kind: 'h', colors: ['#D52B1E', '#F9E300', '#007A33'] }, // Bolivia
  '507': { kind: 'quad', colors: ['#FFFFFF', '#DA121A', '#0033A0', '#FFFFFF'] }, // Panamá
  '506': { kind: 'h', colors: ['#0033A0', '#FFFFFF', '#CE1126', '#FFFFFF', '#0033A0'], weights: [1, 1, 2, 1, 1] }, // Costa Rica
  '502': { kind: 'v', colors: ['#4997D0', '#FFFFFF', '#4997D0'] }, // Guatemala
  '503': { kind: 'h', colors: ['#0047AB', '#FFFFFF', '#0047AB'] }, // El Salvador
  '504': { kind: 'h', colors: ['#0073CF', '#FFFFFF', '#0073CF'] }, // Honduras
  '505': { kind: 'h', colors: ['#0067C6', '#FFFFFF', '#0067C6'] }, // Nicaragua
  '34': { kind: 'h', colors: ['#AA151B', '#F1BF00', '#AA151B'], weights: [1, 2, 1] }, // España
  '44': { kind: 'h', colors: ['#00247D', '#FFFFFF', '#CF142B', '#FFFFFF', '#00247D'] }, // Reino Unido (aprox.)
  '33': { kind: 'v', colors: ['#0055A4', '#FFFFFF', '#EF4135'] }, // Francia
  '49': { kind: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] }, // Alemania
  '39': { kind: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] }, // Italia
  '91': { kind: 'h', colors: ['#FF9933', '#FFFFFF', '#138808'] }, // India
  '27': { kind: 'h', colors: ['#DE3831', '#FFFFFF', '#007A4D', '#FFFFFF', '#001489'] }, // Sudáfrica (aprox.)
  '1': { kind: 'h', colors: ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'] }, // EE.UU./Canadá
};

const DEFAULT_FLAG: FlagSpec = { kind: 'h', colors: ['#94a3b8', '#e2e8f0'] };

export const CountryFlag: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
  const spec = FLAGS[code] || DEFAULT_FLAG;
  const w = 20;
  const h = 14;

  let content: React.ReactNode;
  if (spec.kind === 'quad') {
    content = (
      <>
        <rect x={0} y={0} width={w / 2} height={h / 2} fill={spec.colors[0]} />
        <rect x={w / 2} y={0} width={w / 2} height={h / 2} fill={spec.colors[1]} />
        <rect x={0} y={h / 2} width={w / 2} height={h / 2} fill={spec.colors[2]} />
        <rect x={w / 2} y={h / 2} width={w / 2} height={h / 2} fill={spec.colors[3]} />
      </>
    );
  } else {
    const weights = spec.weights || spec.colors.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let offset = 0;
    content = (
      <>
        {spec.colors.map((color, i) => {
          const size = (weights[i] / total) * (spec.kind === 'h' ? h : w);
          const rect =
            spec.kind === 'h' ? (
              <rect key={i} x={0} y={offset} width={w} height={size} fill={color} />
            ) : (
              <rect key={i} x={offset} y={0} width={size} height={h} fill={color} />
            );
          offset += size;
          return rect;
        })}
      </>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={className}
      style={{ borderRadius: 2, display: 'block' }}
      aria-hidden="true"
    >
      <rect x={0} y={0} width={w} height={h} fill="#e2e8f0" />
      {content}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
    </svg>
  );
};

export default CountryFlag;
