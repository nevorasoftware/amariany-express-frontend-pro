import { elSalvadorData } from '../data/elSalvadorData.js';

const RAILWAY_BACKEND_URL = 'https://amariany-express-backend-pro-production.up.railway.app/api';

async function safeParseJson(res) {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Petición con dirección explícita hacia el backend de Railway
 */
async function smartFetch(endpoint, options = {}) {
  let customUrl = import.meta.env.VITE_API_URL;
  let targetBase = customUrl && customUrl.trim() ? customUrl.trim() : RAILWAY_BACKEND_URL;

  // Limpiar slashes finales
  if (targetBase.endsWith('/')) {
    targetBase = targetBase.slice(0, -1);
  }
  // Asegurar sufijo /api
  if (!targetBase.endsWith('/api')) {
    targetBase += '/api';
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${targetBase}${cleanEndpoint}`;

  try {
    const res = await fetch(fullUrl, options);
    return res;
  } catch (err) {
    console.warn(`[API] Error conectando con ${fullUrl}:`, err);
    throw new Error(`No se pudo conectar con el servidor Backend (${fullUrl}). Por favor verifica tu conexión.`);
  }
}

export async function fetchRoutes(filters = {}) {
  const query = new URLSearchParams();
  if (filters.departamento) query.append('departamento', filters.departamento);
  if (filters.municipio) query.append('municipio', filters.municipio);
  if (filters.distrito) query.append('distrito', filters.distrito);
  if (filters.search) query.append('search', filters.search);

  const res = await smartFetch(`/routes?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Error al cargar las rutas desde la base de datos.');
  }
  const data = await safeParseJson(res);
  return data.data || [];
}

export async function loginAdmin(email, password) {
  const res = await smartFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await safeParseJson(res);
  if (!res.ok) {
    if (res.status === 405) {
      throw new Error('Error 405: El servidor no permitió el método POST. Verifica que VITE_API_URL apunte al backend (amariany-express-backend-pro-production.up.railway.app).');
    }
    throw new Error(data.error || `Error en el servidor (${res.status}). Credenciales o servidor no respondieron correctamente.`);
  }
  return data;
}

export async function uploadImageAndExtractAI(file) {
  const formData = new FormData();
  formData.append('imagen', file);

  const res = await smartFetch('/ai/analyze-image', {
    method: 'POST',
    body: formData
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al procesar la imagen con IA');
  }
  return data;
}

export async function saveRoute(routeData, token) {
  const res = await smartFetch('/routes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(routeData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al guardar la ruta en la base de datos');
  }
  return data.data;
}

export async function updateRoute(id, routeData, token) {
  const res = await smartFetch(`/routes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(routeData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar la ruta');
  }
  return data.data;
}

export async function deleteRoute(id, token) {
  const res = await smartFetch(`/routes/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const data = await safeParseJson(res);
    throw new Error(data.error || 'Error al eliminar la ruta de la base de datos');
  }
  return true;
}

export async function fetchSiteConfig() {
  const res = await smartFetch('/config');
  if (!res.ok) throw new Error('Error al consultar la configuración desde la base de datos');
  const data = await safeParseJson(res);
  return data.data || {
    logoUrl: '/uploads/logo.svg',
    siteName: 'Amairany Express',
    primaryColor: '#4C0070',
    secondaryColor: '#ED0047',
    bgColor: '#F3F3F3'
  };
}

export async function uploadLogo(imageBase64, filename = 'logo.png') {
  const res = await smartFetch('/config/logo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, filename })
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el logo');
  }
  return data.data;
}

// CLIENTES / VENDEDORES API
export async function fetchSellers(search = '') {
  const query = new URLSearchParams();
  if (search) query.append('search', search);

  const res = await smartFetch(`/sellers?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Error al obtener la lista de clientes/vendedores.');
  }
  const data = await safeParseJson(res);
  return data.data || [];
}

export async function saveSeller(sellerData, token) {
  const res = await smartFetch('/sellers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sellerData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al guardar el vendedor');
  }
  return data.data;
}

export async function updateSeller(id, sellerData, token) {
  const res = await smartFetch(`/sellers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sellerData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el vendedor');
  }
  return data.data;
}

export async function deleteSeller(id, token) {
  const res = await smartFetch(`/sellers/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const data = await safeParseJson(res);
    throw new Error(data.error || 'Error al eliminar el vendedor');
  }
  return true;
}

// API DE PAQUETES (CASILLERO)
export async function fetchPackages(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await smartFetch(`/packages${query}`);
  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al consultar paquetes');
  }
  return data.data || [];
}

export async function analyzePackageImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await smartFetch('/packages/analyze-image', {
    method: 'POST',
    body: formData
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al analizar la imagen del paquete con Gemini');
  }
  return data.data;
}

export async function savePackage(packageData, token) {
  const res = await smartFetch('/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(packageData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al recepcionar paquete');
  }
  return data.data;
}

export async function deletePackage(id, token) {
  const res = await smartFetch(`/packages/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const data = await safeParseJson(res);
    throw new Error(data.error || 'Error al eliminar paquete');
  }
  return true;
}

export async function updatePackage(id, packageData, token) {
  const res = await smartFetch(`/packages/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(packageData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar paquete');
  }
  return data.data;
}

export async function fetchPackageByCode(codigo) {
  const res = await smartFetch(`/packages/code/${encodeURIComponent(codigo)}`);
  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || `No se encontró ningún paquete con el código "${codigo}"`);
  }
  return data.data;
}

export async function uploadDeliveryImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await smartFetch('/packages/upload-delivery-image', {
    method: 'POST',
    body: formData
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al subir la fotografía de entrega');
  }
  return data.data;
}

// API DE PLANILLAS (LIQUIDACIÓN Y PAGOS)
export async function fetchPlanillas() {
  const res = await smartFetch('/planillas');
  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al consultar planillas de liquidación');
  }
  return Array.isArray(data) ? data : (data.data || []);
}

export async function savePlanilla(planillaData, token) {
  const res = await smartFetch('/planillas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(planillaData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al generar planilla de liquidación');
  }
  return data.data;
}

export async function updatePlanillaStatus(id, planillaData, token) {
  const res = await smartFetch(`/planillas/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(planillaData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar estado de la planilla');
  }
  return data.data;
}

export async function liquidarPackageIndividualApi(id, estadoLiquidacion, token) {
  const res = await smartFetch(`/packages/${id}/liquidar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ estadoLiquidacion })
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar liquidación del paquete');
  }
  return data.data;
}

// API DE SOCIOS (REPARTIDORES / SOCIOS CON RUTA)
export async function fetchSocios(search = '') {
  const query = new URLSearchParams();
  if (search) query.append('search', search);

  const res = await smartFetch(`/socios?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Error al obtener la lista de socios.');
  }
  const data = await safeParseJson(res);
  return data.data || [];
}

export async function saveSocio(socioData, token) {
  const res = await smartFetch('/socios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(socioData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al registrar el socio');
  }
  return data.data;
}

export async function updateSocio(id, socioData, token) {
  const res = await smartFetch(`/socios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(socioData)
  });

  const data = await safeParseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el socio');
  }
  return data.data;
}

export async function deleteSocio(id, token) {
  const res = await smartFetch(`/socios/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const data = await safeParseJson(res);
    throw new Error(data.error || 'Error al eliminar el socio');
  }
  return true;
}



