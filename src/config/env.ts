export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const IS_CLOUD_DEV = import.meta.env.VITE_IS_CLOUD_DEV === 'true';
export const IS_LOCAL_DEV = !IS_CLOUD_DEV && import.meta.env.DEV;

// Puedes agregar más configuraciones dependientes del entorno aquí.
