import React, { useState, useEffect } from 'react';
import { Upload, Sparkles, Database, Trash2, Edit3, CheckCircle2, AlertCircle, Plus, RefreshCw, Eye, Image as ImageIcon, MapPin, Calendar, Clock, Layers, X, Save, Palette, Users, Search, UserPlus, Phone, CreditCard, Store, Mail, FileText, Package, Box, DollarSign, Calendar as CalendarIcon, PhoneCall, Camera, Truck, Download, FileSpreadsheet, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { uploadImageAndExtractAI, saveRoute, updateRoute, deleteRoute, uploadLogo, fetchSellers, saveSeller, updateSeller, deleteSeller, fetchPackages, fetchPackageByCode, uploadDeliveryImage, analyzePackageImage, savePackage, updatePackage, deletePackage, fetchPlanillas, savePlanilla, updatePlanillaStatus, liquidarPackageIndividualApi, fetchSocios, saveSocio, updateSocio, deleteSocio } from '../services/api';
import { elSalvadorData } from '../data/elSalvadorData';

// Helper para exportar arreglos a CSV compatible con Microsoft Excel (BOM UTF-8)
export function downloadExcelCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const BOM = "\uFEFF";
  const keys = Object.keys(rows[0]);
  let csvContent = BOM + keys.join(",") + "\n";

  rows.forEach(row => {
    const values = keys.map(k => {
      let val = row[k] === null || row[k] === undefined ? "" : String(row[k]);
      val = val.replace(/"/g, '""');
      if (val.includes(",") || val.includes("\n") || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvContent += values.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper para resolver la URL completa de las imágenes del backend (Railway o local)
export function getPackageImageSrc(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const cleanUrl = url.trim();

  if (cleanUrl.startsWith('data:image') || cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }

  let backendOrigin = (import.meta.env.VITE_API_URL || 'https://amariany-express-backend-pro-production.up.railway.app')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');

  let path = cleanUrl;
  if (path.startsWith('/uploads/')) {
    // Ya tiene el formato correcto /uploads/
  } else if (path.startsWith('uploads/')) {
    path = `/${path}`;
  } else {
    const filename = path.replace(/^\/+/, '');
    path = `/uploads/${filename}`;
  }

  return `${backendOrigin}${path}`;
}

// Generador de fallback SVG elegante para asegurar que NUNCA falle la imagen
export function getRouteImageSrc(url, lugarPrincipal = 'AMAIRANY EXPRESS') {
  if (url && (url.startsWith('data:image') || url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  if (url && url.startsWith('/uploads')) {
    return getPackageImageSrc(url);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%234C0070"/>
    <circle cx="520" cy="70" r="150" fill="%23ED0047" opacity="0.35"/>
    <circle cx="80" cy="340" r="130" fill="%23FF2A6D" opacity="0.25"/>
    <rect x="40" y="40" width="520" height="320" rx="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="50%" y="42%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="Outfit, sans-serif" font-size="28" font-weight="900" letter-spacing="2">AMAIRANY EXPRESS</text>
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%23ED0047" font-family="Outfit, sans-serif" font-size="22" font-weight="800">${lugarPrincipal}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// HELPER DE MANEJO Y CÁLCULO DE FECHAS (dd/mm/yy)
export function formatDDMMYY(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

export function parseDDMMYY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  const parts = clean.split('/');
  if (parts.length !== 3) return null;
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 100) year += 2000;
  return new Date(year, month - 1, day);
}

export function calculateNextRouteDate(text, baseDate = new Date()) {
  if (!text) return formatDDMMYY(baseDate);
  const lower = text.toLowerCase();
  
  const daysMap = [
    { name: 'domingo', num: 0 },
    { name: 'lunes', num: 1 },
    { name: 'martes', num: 2 },
    { name: 'miercoles', num: 3 },
    { name: 'miércoles', num: 3 },
    { name: 'jueves', num: 4 },
    { name: 'viernes', num: 5 },
    { name: 'sabado', num: 6 },
    { name: 'sábado', num: 6 },
  ];

  const matchedDays = daysMap.filter(d => lower.includes(d.name));
  
  if (matchedDays.length === 0) {
    const parsed = parseDDMMYY(text);
    if (parsed) {
      const todayZero = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
      return parsed >= todayZero ? formatDDMMYY(parsed) : formatDDMMYY(baseDate);
    }
    return formatDDMMYY(baseDate);
  }

  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const currentDayNum = today.getDay();

  let minDaysAhead = 999;
  matchedDays.forEach(d => {
    let diff = d.num - currentDayNum;
    if (diff <= 0) {
      diff += 7;
    }
    if (diff < minDaysAhead) {
      minDaysAhead = diff;
    }
  });

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + minDaysAhead);
  return formatDDMMYY(nextDate);
}

export function isDateTodayOrFuture(dateStr, baseDate = new Date()) {
  const parsed = parseDDMMYY(dateStr);
  if (!parsed) return true;
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  return parsed >= today;
}

export function checkPackageBelongsToSocio(pkg, socioRoutesList, routesList) {
  if (!socioRoutesList || socioRoutesList.length === 0) return false;

  // 1. Verificación directa por la columna "rutaCodigo" (Ej: "R-OJB")
  if (pkg.rutaCodigo) {
    const pkgRutaClean = pkg.rutaCodigo.trim().toLowerCase();
    const directMatch = socioRoutesList.some(rCode => rCode.trim().toLowerCase() === pkgRutaClean);
    if (directMatch) return true;
  }

  // 2. Verificación secundaria por coincidencia en texto de destino o nombre de municipio
  const destLower = (pkg.destino || '').toLowerCase();
  return socioRoutesList.some(rCode => {
    if (!rCode) return false;
    const codeLower = rCode.toLowerCase().trim();
    if (destLower.includes(codeLower)) return true;

    const rObj = routesList ? routesList.find(r => (r.codigo || '').toLowerCase().trim() === codeLower || (r.lugarPrincipal || '').toLowerCase().trim() === codeLower) : null;
    if (rObj) {
      if (rObj.lugarPrincipal && destLower.includes(rObj.lugarPrincipal.toLowerCase())) return true;
      if (rObj.lugarReferencia && destLower.includes(rObj.lugarReferencia.toLowerCase())) return true;
    }
    return false;
  });
}

export default function AdminPanel({ routes, onRefreshRoutes, adminToken, adminUser, siteConfig, onConfigUpdated }) {
  const isSocioRole = adminUser?.role === 'SOCIO';
  const [activeSubTab, setActiveSubTab] = useState(isSocioRole ? 'dispatch' : 'upload');

  useEffect(() => {
    if (isSocioRole && activeSubTab !== 'dispatch') {
      setActiveSubTab('dispatch');
    }
  }, [isSocioRole, activeSubTab]);

  // Estado para la actualización del Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);

  // Estado para la carga de imagen con IA
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);

  // Formulario de Creación de Nueva Ruta
  const [formData, setFormData] = useState({
    lugarPrincipal: '',
    lugarReferencia: '',
    dias: '',
    horario: '',
    tipoPunto: 'PUNTO DE ENTREGA',
    departamentoNombre: 'La Libertad',
    municipioNombre: 'La Libertad Norte',
    distritoNombre: 'San Pablo Tacachico',
    imagenUrl: ''
  });

  // Estado para Edición de Ruta Existente (Modal de Edición)
  const [editingRoute, setEditingRoute] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Estados y Funciones para Clientes (Vendedores)
  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(false);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerFormData, setSellerFormData] = useState({
    nombre: '',
    dui: '',
    tienda: '',
    correo: '',
    whatsapp: '',
    cuentaBancoAgricola: ''
  });
  const [editingSeller, setEditingSeller] = useState(null);
  const [editSellerFormData, setEditSellerFormData] = useState(null);

  const loadSellers = async (search = sellerSearch) => {
    setSellersLoading(true);
    try {
      const data = await fetchSellers(search);
      setSellers(data);
    } catch (err) {
      console.error("Error al cargar vendedores:", err);
    } finally {
      setSellersLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'sellers') {
      loadSellers();
    }
  }, [activeSubTab]);

  // Validador de formulario en el Frontend
  const validateSellerForm = (data) => {
    if (!data.nombre || !data.nombre.trim()) return '⚠️ Todos los campos son obligatorios: Complete el Nombre Completo.';
    if (!data.dui || !data.dui.trim()) return '⚠️ Todos los campos son obligatorios: Complete el DUI.';
    if (!/^\d{8}-\d{1}$/.test(data.dui.trim())) return '⚠️ Formato de DUI inválido: Debe ser de 8 números, un guión y 1 número (Ej: 00000000-0).';
    if (!data.tienda || !data.tienda.trim()) return '⚠️ Todos los campos son obligatorios: Complete el Nombre de Tienda / Negocio.';
    if (!data.correo || !data.correo.trim()) return '⚠️ Todos los campos son obligatorios: Complete el Correo Electrónico.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) return '⚠️ Correo Electrónico inválido (Ej: usuario@dominio.com).';
    if (!data.whatsapp || !data.whatsapp.trim()) return '⚠️ Todos los campos son obligatorios: Complete el WhatsApp / Teléfono.';
    if (!/^\d{4}-\d{4}$/.test(data.whatsapp.trim())) return '⚠️ Formato de Teléfono inválido: Debe ser de 4 números, un guión y 4 números (Ej: 7788-9900).';
    if (!data.cuentaBancoAgricola || !data.cuentaBancoAgricola.trim()) return '⚠️ Todos los campos son obligatorios: Complete la Cuenta Banco Agrícola.';
    if (!/^\d+$/.test(data.cuentaBancoAgricola.trim())) return '⚠️ Cuenta Banco Agrícola inválida: Debe contener únicamente números.';
    return null;
  };

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    const errText = validateSellerForm(sellerFormData);
    if (errText) {
      setNotification({ type: 'error', text: errText });
      return;
    }
    setSaveLoading(true);
    try {
      await saveSeller(sellerFormData, adminToken);
      setNotification({ type: 'success', text: '¡Cliente Vendedor guardado exitosamente con todas las validaciones!' });
      setSellerFormData({ nombre: '', dui: '', tienda: '', correo: '', whatsapp: '', cuentaBancoAgricola: '' });
      loadSellers();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al registrar vendedor: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStartEditSeller = (seller) => {
    setEditingSeller(seller);
    setEditSellerFormData({
      id: seller.id,
      nombre: seller.nombre || '',
      dui: seller.dui || '',
      tienda: seller.tienda || '',
      correo: seller.correo || '',
      whatsapp: seller.whatsapp || '',
      cuentaBancoAgricola: seller.cuentaBancoAgricola || '',
      estado: seller.estado || 'ACTIVO'
    });
  };

  const handleSaveEditedSeller = async (e) => {
    e.preventDefault();
    if (!editSellerFormData) return;
    const errText = validateSellerForm(editSellerFormData);
    if (errText) {
      setNotification({ type: 'error', text: errText });
      return;
    }
    setSaveLoading(true);
    try {
      await updateSeller(editSellerFormData.id, editSellerFormData, adminToken);
      setNotification({ type: 'success', text: `¡Vendedor "${editSellerFormData.nombre}" actualizado con éxito!` });
      setEditingSeller(null);
      setEditSellerFormData(null);
      loadSellers();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al actualizar vendedor: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente/vendedor?')) return;
    try {
      await deleteSeller(id, adminToken);
      setNotification({ type: 'success', text: '¡Vendedor eliminado exitosamente!' });
      loadSellers();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al eliminar vendedor: ' + err.message });
    }
  };

  // ESTADOS Y FUNCIONES PARA SOCIOS (REPARTIDORES / SOCIOS CON RUTA)
  const [socios, setSocios] = useState([]);
  const [sociosLoading, setSociosLoading] = useState(false);
  const [socioSearch, setSocioSearch] = useState('');
  const [socioRouteFilter, setSocioRouteFilter] = useState('');
  const [editSocioRouteFilter, setEditSocioRouteFilter] = useState('');
  const [socioFormData, setSocioFormData] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    dui: '',
    rutas: []
  });
  const [editingSocio, setEditingSocio] = useState(null);
  const [editSocioFormData, setEditSocioFormData] = useState(null);

  const loadSocios = async (search = socioSearch) => {
    setSociosLoading(true);
    try {
      const data = await fetchSocios(search);
      setSocios(data);
    } catch (err) {
      console.error("Error al cargar socios:", err);
    } finally {
      setSociosLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'socios') {
      loadSocios();
    }
  }, [activeSubTab]);

  const toggleRouteForSocio = (routeCode, isEdit = false) => {
    if (isEdit) {
      setEditSocioFormData(prev => {
        const current = prev.rutas || [];
        const exists = current.includes(routeCode);
        const updated = exists ? current.filter(r => r !== routeCode) : [...current, routeCode];
        return { ...prev, rutas: updated };
      });
    } else {
      setSocioFormData(prev => {
        const current = prev.rutas || [];
        const exists = current.includes(routeCode);
        const updated = exists ? current.filter(r => r !== routeCode) : [...current, routeCode];
        return { ...prev, rutas: updated };
      });
    }
  };

  const removeSelectedRoute = (routeCode, isEdit = false) => {
    if (isEdit) {
      setEditSocioFormData(prev => ({
        ...prev,
        rutas: (prev.rutas || []).filter(r => r !== routeCode)
      }));
    } else {
      setSocioFormData(prev => ({
        ...prev,
        rutas: (prev.rutas || []).filter(r => r !== routeCode)
      }));
    }
  };

  const clearAllSelectedRoutes = (isEdit = false) => {
    if (isEdit) {
      setEditSocioFormData(prev => ({ ...prev, rutas: [] }));
    } else {
      setSocioFormData(prev => ({ ...prev, rutas: [] }));
    }
  };

  const validateSocioForm = (data) => {
    if (!data.nombre || !data.nombre.trim()) return '⚠️ Complete el Nombre Completo del Socio.';
    if (data.dui && data.dui.trim() && !/^\d{8}-\d{1}$/.test(data.dui.trim())) return '⚠️ Formato de DUI inválido: Debe ser de 8 números, un guión y 1 número (Ej: 00000000-0).';
    if (data.correo && data.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) return '⚠️ Correo Electrónico inválido (Ej: usuario@dominio.com).';
    if (data.telefono && data.telefono.trim() && !/^\d{4}-\d{4}$/.test(data.telefono.trim())) return '⚠️ Formato de Teléfono inválido: Debe ser de 4 números, un guión y 4 números (Ej: 7788-9900).';
    return null;
  };

  const handleCreateSocio = async (e) => {
    e.preventDefault();
    const errText = validateSocioForm(socioFormData);
    if (errText) {
      setNotification({ type: 'error', text: errText });
      return;
    }
    setSaveLoading(true);
    try {
      const created = await saveSocio(socioFormData, adminToken);
      const codeMsg = created?.codigo ? ` con código de socio ${created.codigo}` : '';
      setNotification({ type: 'success', text: `¡Socio "${created.nombre}" registrado exitosamente${codeMsg}!` });
      setSocioFormData({ nombre: '', telefono: '', correo: '', dui: '', rutas: [] });
      loadSocios();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al registrar socio: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStartEditSocio = (socio) => {
    setEditingSocio(socio);
    const rawRutas = socio.rutas || socio.ruta || '';
    const rutasArray = rawRutas
      ? rawRutas.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    setEditSocioFormData({
      id: socio.id,
      codigo: socio.codigo || '',
      nombre: socio.nombre || '',
      telefono: socio.telefono || '',
      correo: socio.correo || '',
      dui: socio.dui || '',
      rutas: rutasArray
    });
  };

  const handleSaveEditedSocio = async (e) => {
    e.preventDefault();
    if (!editSocioFormData) return;
    const errText = validateSocioForm(editSocioFormData);
    if (errText) {
      setNotification({ type: 'error', text: errText });
      return;
    }
    setSaveLoading(true);
    try {
      await updateSocio(editSocioFormData.id, editSocioFormData, adminToken);
      setNotification({ type: 'success', text: `¡Socio "${editSocioFormData.nombre}" actualizado con éxito!` });
      setEditingSocio(null);
      setEditSocioFormData(null);
      loadSocios();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al actualizar socio: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSocio = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este socio?')) return;
    try {
      await deleteSocio(id, adminToken);
      setNotification({ type: 'success', text: '¡Socio eliminado exitosamente!' });
      loadSocios();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al eliminar socio: ' + err.message });
    }
  };

  // ESTADOS Y FUNCIONES PARA INGRESO DE PAQUETES (CASILLERO)
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageSearch, setPackageSearch] = useState('');
  
  const [packageFile, setPackageFile] = useState(null);
  const [packageFilePreview, setPackageFilePreview] = useState(null);
  const [packageAnalyzing, setPackageAnalyzing] = useState(false);

  const [sellerFilterQuery, setSellerFilterQuery] = useState('');
  const [routeFilterQuery, setRouteFilterQuery] = useState('');

  const getTodayFormattedDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const [packageFormData, setPackageFormData] = useState({
    codigo: '',
    cliente: '',
    destino: '',
    vendedorNombre: '',
    valor: 0,
    envio: 0,
    total: 0,
    telefono: '',
    fechaEntrega: getTodayFormattedDate(),
    imagenUrl: '',
    tipoPago: 'EFECTIVO'
  });

  const [viewingPackage, setViewingPackage] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);

  // Estado para Despacho / Entrega de Paquetes
  const [dispatchCodeSearch, setDispatchCodeSearch] = useState('');
  const [dispatchPackage, setDispatchPackage] = useState(null);
  const [dispatchSearchLoading, setDispatchSearchLoading] = useState(false);
  const [deliveryFile, setDeliveryFile] = useState(null);
  const [deliveryFilePreview, setDeliveryFilePreview] = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchNotification, setDispatchNotification] = useState({ type: '', text: '' });

  // Estados y Funciones para Liquidación y Planillas
  const [planillas, setPlanillas] = useState([]);
  const [planillasLoading, setPlanillasLoading] = useState(false);
  const [settlementDateFilter, setSettlementDateFilter] = useState('');
  const [settlementTypeFilter, setSettlementTypeFilter] = useState('TODOS');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('TODOS');
  const [generatingPlanilla, setGeneratingPlanilla] = useState(false);

  const loadPlanillas = async () => {
    setPlanillasLoading(true);
    try {
      const data = await fetchPlanillas();
      setPlanillas(data);
    } catch (err) {
      console.error("Error al cargar planillas:", err);
    } finally {
      setPlanillasLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'settlement') {
      loadPlanillas();
    }
  }, [activeSubTab]);

  const handleGeneratePlanilla = async (tipoPagoPlanilla, packagesToInclude) => {
    const targetPackages = (packagesToInclude || []).filter(p => {
      if (tipoPagoPlanilla !== 'TODOS' && p.tipoPago !== tipoPagoPlanilla) return false;
      return true;
    });

    if (targetPackages.length === 0) {
      alert(`No hay paquetes ${tipoPagoPlanilla} para incluir en la planilla.`);
      return;
    }

    const totalMonto = targetPackages.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    const detailPayload = targetPackages.map(p => ({
      id: p.id,
      codigo: p.codigo,
      cliente: p.cliente,
      destino: p.destino,
      vendedorNombre: p.vendedorNombre,
      valor: p.valor,
      envio: p.envio,
      total: p.total,
      tipoPago: p.tipoPago,
      estadoLiquidacion: p.estadoLiquidacion || 'PENDIENTE'
    }));

    setGeneratingPlanilla(true);
    try {
      const todayDateStr = getTodayFormattedDate();
      await savePlanilla({
        fecha: todayDateStr,
        tipoPago: tipoPagoPlanilla,
        montoTotal: totalMonto,
        estado: 'GENERADA',
        detalleJson: JSON.stringify(detailPayload)
      }, adminToken);

      setNotification({ type: 'success', text: `¡Planilla de ${tipoPagoPlanilla} generada exitosamente!` });
      loadPlanillas();
      loadPackages();
    } catch (err) {
      alert('Error al generar planilla: ' + err.message);
    } finally {
      setGeneratingPlanilla(false);
    }
  };

  const handleUpdatePlanillaStatus = async (planillaId, newStatus) => {
    try {
      await updatePlanillaStatus(planillaId, { estado: newStatus }, adminToken);
      setNotification({ type: 'success', text: `¡Planilla actualizada a estado ${newStatus}! Todos los paquetes de la planilla fueron actualizados.` });
      loadPlanillas();
      loadPackages();
    } catch (err) {
      alert('Error al actualizar planilla: ' + err.message);
    }
  };

  const handleLiquidarIndividual = async (pkgId) => {
    try {
      await liquidarPackageIndividualApi(pkgId, 'PROCESADA', adminToken);
      setNotification({ type: 'success', text: '¡Paquete en efectivo marcado como Entregado/Cobrado por Vendedor!' });
      loadPackages();
      loadPlanillas();
    } catch (err) {
      alert('Error al liquidar paquete: ' + err.message);
    }
  };

  const handleSearchPackageForDispatch = async (e) => {
    if (e) e.preventDefault();
    if (!dispatchCodeSearch || !dispatchCodeSearch.trim()) {
      setDispatchNotification({ type: 'error', text: 'Por favor ingrese o seleccione el Código del Paquete (Ej: P-A1B2C).' });
      return;
    }
    setDispatchSearchLoading(true);
    setDispatchNotification({ type: '', text: '' });
    setDispatchPackage(null);
    setDeliveryFile(null);
    setDeliveryFilePreview(null);
    try {
      const codeClean = dispatchCodeSearch.trim();
      let pkg = null;
      try {
        pkg = await fetchPackageByCode(codeClean);
      } catch (err) {
        if (packages && packages.length > 0) {
          pkg = packages.find(p => p.codigo && p.codigo.toLowerCase() === codeClean.toLowerCase());
        }
      }
      if (!pkg) {
        setDispatchNotification({ type: 'error', text: `No se encontró ningún paquete registrado con el código "${codeClean}".` });
      } else {
        setDispatchPackage(pkg);
        setDispatchNotification({ type: 'success', text: `¡Paquete ${pkg.codigo} localizado correctamente!` });
      }
    } catch (err) {
      setDispatchNotification({ type: 'error', text: err.message || 'Error al buscar paquete por código.' });
    } finally {
      setDispatchSearchLoading(false);
    }
  };

  const handleDeliveryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDeliveryFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDeliveryFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmDispatch = async (e) => {
    if (e) e.preventDefault();
    if (!dispatchPackage) return;

    // Validar obligatoriamente que la fotografía de entrega esté cargada
    const hasDeliveryPhoto = !!(deliveryFile || deliveryFilePreview || dispatchPackage.imagenEntregaUrl);
    if (!hasDeliveryPhoto && dispatchPackage.estado !== 'ENTREGADO') {
      setDispatchNotification({
        type: 'error',
        text: '⚠️ Debe tomar o adjuntar la fotografía de comprobante de entrega antes de marcar el paquete como ENTREGADO.'
      });
      return;
    }

    setDispatchLoading(true);
    setDispatchNotification({ type: '', text: '' });
    try {
      let finalDeliveryImgUrl = (deliveryFilePreview && deliveryFilePreview.startsWith('data:image')) ? deliveryFilePreview : (dispatchPackage.imagenEntregaUrl || null);
      if (!finalDeliveryImgUrl && deliveryFile) {
        try {
          const uploadRes = await uploadDeliveryImage(deliveryFile);
          finalDeliveryImgUrl = uploadRes.imagenEntregaUrl;
        } catch (err) {
          console.error("Error al subir imagen de entrega:", err);
        }
      }

      const todayDate = getTodayFormattedDate();
      await updatePackage(dispatchPackage.id, {
        estado: 'ENTREGADO',
        fechaEntrega: todayDate,
        imagenEntregaUrl: finalDeliveryImgUrl
      }, adminToken);

      setDispatchPackage(prev => ({
        ...prev,
        estado: 'ENTREGADO',
        fechaEntrega: todayDate,
        imagenEntregaUrl: finalDeliveryImgUrl
      }));

      setDispatchNotification({
        type: 'success',
        text: `¡Paquete ${dispatchPackage.codigo || ''} marcado como ENTREGADO exitosamente! Se registró la fecha (${todayDate}) y la fotografía de entrega.`
      });

      setNotification({
        type: 'success',
        text: `¡Paquete ${dispatchPackage.codigo || ''} marcado como ENTREGADO exitosamente!`
      });

      loadPackages();
    } catch (err) {
      setDispatchNotification({
        type: 'error',
        text: 'Error al registrar el despacho/entrega: ' + err.message
      });
    } finally {
      setDispatchLoading(false);
    }
  };
  const [editPackageFormData, setEditPackageFormData] = useState({
    cliente: '',
    destino: '',
    vendedorNombre: '',
    valor: 0,
    envio: 0,
    total: 0,
    telefono: '',
    fechaEntrega: '',
    tipoPago: 'EFECTIVO',
    estado: 'RECEPCIONADO'
  });

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setEditPackageFormData({
      cliente: pkg.cliente || '',
      destino: pkg.destino || '',
      vendedorNombre: pkg.vendedorNombre || '',
      valor: pkg.valor || 0,
      envio: pkg.envio || 0,
      total: pkg.total || 0,
      telefono: pkg.telefono || '',
      fechaEntrega: pkg.fechaEntrega || '',
      tipoPago: pkg.tipoPago || 'EFECTIVO',
      estado: pkg.estado || 'RECEPCIONADO',
      imagenUrl: pkg.imagenUrl || ''
    });
  };

  const handleSaveEditedPackage = async (e) => {
    e.preventDefault();
    if (!editingPackage) return;
    setSaveLoading(true);
    try {
      await updatePackage(editingPackage.id, editPackageFormData, adminToken);
      setNotification({ type: 'success', text: `¡Paquete ${editingPackage.codigo || ''} actualizado correctamente!` });
      setEditingPackage(null);
      loadPackages();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al actualizar paquete: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const loadPackages = async (search = packageSearch) => {
    setPackagesLoading(true);
    try {
      const data = await fetchPackages(search);
      setPackages(data);
    } catch (err) {
      console.error("Error al cargar paquetes:", err);
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'packages') {
      loadPackages();
      loadSellers();
    }
  }, [activeSubTab]);

  const handlePackageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPackageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPackageFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessPackageAI = async () => {
    if (!packageFile) {
      setNotification({ type: 'error', text: 'Por favor seleccione o capture una imagen del paquete antes de procesar.' });
      return;
    }
    setPackageAnalyzing(true);
    try {
      const result = await analyzePackageImage(packageFile);
      setNotification({
        type: result.apiSuccess ? 'success' : 'info',
        text: '¡Escaneo de imagen completado exitosamente! Verifique los datos extraídos en el formulario.'
      });

      const valorVal = parseFloat(result.valor) || 0;
      const envioVal = parseFloat(result.envio) || 0;
      const totalVal = parseFloat(result.total) || (valorVal + envioVal);

      // Coincidencia inteligente para Vendedor / Tienda activo
      let matchedVendedor = result.vendedor || '';
      if (result.vendedor && sellers && sellers.length > 0) {
        const vClean = result.vendedor.trim().toLowerCase();
        const foundSeller = sellers.find(s => {
          const tClean = (s.tienda || '').trim().toLowerCase();
          const nClean = (s.nombre || '').trim().toLowerCase();
          return (tClean && (vClean.includes(tClean) || tClean.includes(vClean))) ||
                 (nClean && (vClean.includes(nClean) || nClean.includes(vClean)));
        });
        if (foundSeller) {
          matchedVendedor = foundSeller.tienda ? `${foundSeller.tienda} (${foundSeller.nombre})` : foundSeller.nombre;
        }
      }

      // Coincidencia inteligente para Destino (Ruta de Entrega)
      let matchedDestino = result.destino || '';
      if (result.destino && routes && routes.length > 0) {
        const dClean = result.destino.trim().toLowerCase();
        const foundRoute = routes.find(r => {
          const pClean = (r.lugarPrincipal || '').trim().toLowerCase();
          const refClean = (r.lugarReferencia || '').trim().toLowerCase();
          return (pClean && (dClean.includes(pClean) || pClean.includes(dClean))) ||
                 (refClean && (dClean.includes(refClean) || refClean.includes(dClean)));
        });
        if (foundRoute) {
          matchedDestino = `${foundRoute.lugarPrincipal}${foundRoute.lugarReferencia ? ' - ' + foundRoute.lugarReferencia : ''}`;
        }
      }

      // Calcular fecha de entrega automática en formato dd/mm/yy para el próximo día programado
      let calculatedDeliveryDate = formatDDMMYY(new Date());
      if (result.fechaEntrega) {
        calculatedDeliveryDate = calculateNextRouteDate(result.fechaEntrega);
      } else if (matchedDestino && routes && routes.length > 0) {
        const matchedRouteObj = routes.find(r => `${r.lugarPrincipal}${r.lugarReferencia ? ' - ' + r.lugarReferencia : ''}` === matchedDestino);
        if (matchedRouteObj && matchedRouteObj.dias) {
          calculatedDeliveryDate = calculateNextRouteDate(matchedRouteObj.dias);
        }
      }

      setPackageFormData(prev => ({
        ...prev,
        cliente: result.cliente || prev.cliente,
        destino: matchedDestino || prev.destino,
        vendedorNombre: matchedVendedor || prev.vendedorNombre,
        valor: valorVal,
        envio: envioVal,
        total: totalVal,
        telefono: result.telefono || prev.telefono,
        fechaEntrega: calculatedDeliveryDate,
        imagenUrl: packageFilePreview || result.imagenUrl || prev.imagenUrl
      }));
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'No se pudo leer la imagen automáticamente. Puede ingresar los datos manualmente.'
      });
    } finally {
      setPackageAnalyzing(false);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    if (!packageFormData.cliente.trim()) {
      setNotification({ type: 'error', text: 'El nombre del cliente destinatario es obligatorio.' });
      return;
    }
    if (!packageFormData.destino.trim()) {
      setNotification({ type: 'error', text: 'El destino o dirección de entrega es obligatorio.' });
      return;
    }
    if (!packageFormData.vendedorNombre.trim()) {
      setNotification({ type: 'error', text: 'Debe seleccionar o especificar el Vendedor / Tienda / Emisor.' });
      return;
    }
    if (!packageFormData.telefono.trim()) {
      setNotification({ type: 'error', text: 'El teléfono de contacto es obligatorio.' });
      return;
    }
    if (packageFormData.fechaEntrega && !isDateTodayOrFuture(packageFormData.fechaEntrega)) {
      setNotification({
        type: 'error',
        text: `⚠️ No se puede recepcionar: La fecha de entrega ("${packageFormData.fechaEntrega}") no puede ser anterior a la fecha actual (${formatDDMMYY(new Date())}).`
      });
      return;
    }

    const finalPayload = {
      ...packageFormData,
      imagenUrl: packageFormData.imagenUrl || packageFilePreview || null
    };

    setSaveLoading(true);
    try {
      const createdPkg = await savePackage(finalPayload, adminToken);
      const pkgCodeMsg = createdPkg?.codigo ? ` y su código de paquete es: ${createdPkg.codigo}` : '';
      setNotification({ type: 'success', text: `¡Paquete recepcionado exitosamente en el casillero!${pkgCodeMsg}` });
      setPackageFormData({
        codigo: '',
        cliente: '',
        destino: '',
        vendedorNombre: '',
        valor: 0,
        envio: 0,
        total: 0,
        telefono: '',
        fechaEntrega: formatDDMMYY(new Date()),
        imagenUrl: '',
        tipoPago: 'EFECTIVO'
      });
      setPackageFile(null);
      setPackageFilePreview(null);
      loadPackages();
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al recepcionar paquete: ' + err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta recepción de paquete?')) {
      try {
        await deletePackage(id, adminToken);
        setNotification({ type: 'success', text: 'Paquete eliminado correctamente.' });
        loadPackages();
      } catch (err) {
        setNotification({ type: 'error', text: 'Error al eliminar paquete: ' + err.message });
      }
    }
  };

  // Listas desplegables para Formulario de Creación
  const selectedDeptObj = elSalvadorData.find(d => d.departamento === formData.departamentoNombre);
  const municipiosList = selectedDeptObj ? selectedDeptObj.municipios : [];
  const selectedMunObj = municipiosList.find(m => m.nombre === formData.municipioNombre);
  const distritosList = selectedMunObj ? selectedMunObj.distritos : [];

  // Listas desplegables para Formulario de Edición
  const editSelectedDeptObj = editFormData ? elSalvadorData.find(d => d.departamento === editFormData.departamentoNombre) : null;
  const editMunicipiosList = editSelectedDeptObj ? editSelectedDeptObj.municipios : [];
  const editSelectedMunObj = editMunicipiosList.find(m => m.nombre === editFormData?.municipioNombre);
  const editDistritosList = editSelectedMunObj ? editSelectedMunObj.distritos : [];

  // Manejar selección de imagen en Creación
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setAiLogs([]);
    }
  };

  // Manejar selección de nueva imagen en Edición
  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        setEditFilePreview(base64Data);
        setEditFormData(prev => ({
          ...prev,
          imagenUrl: base64Data
        }));
        setNotification({ type: 'success', text: '¡Nueva imagen preparada en Base64 para la base de datos!' });
      };
      reader.readAsDataURL(file);
    }
  };

  // Procesar Imagen con IA (Creación)
  const handleProcessImageAI = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setNotification({ type: '', text: '' });

    try {
      const result = await uploadImageAndExtractAI(selectedFile);
      const ext = result.extracted;

      setFormData(prev => ({
        ...prev,
        lugarPrincipal: ext.lugarPrincipal || prev.lugarPrincipal,
        lugarReferencia: ext.lugarReferencia || prev.lugarReferencia,
        dias: ext.dias || prev.dias,
        horario: ext.horario || prev.horario,
        tipoPunto: ext.tipoPunto || prev.tipoPunto,
        departamentoNombre: ext.departamento || prev.departamentoNombre,
        municipioNombre: ext.municipio || prev.municipioNombre,
        distritoNombre: ext.distrito || prev.distritoNombre,
        imagenUrl: result.imagenUrl || prev.imagenUrl
      }));

      setNotification({
        type: ext.apiSuccess ? 'success' : 'info',
        text: '¡Información extraída de la imagen con éxito! Revise los datos y guarde la ruta.'
      });
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Error al analizar la imagen: ' + err.message
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Guardar Nueva Ruta
  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setNotification({ type: '', text: '' });

    // Validar si la ruta (Lugar Principal + Lugar de Referencia) ya existe
    const targetPrincipal = (formData.lugarPrincipal || '').trim().toLowerCase();
    const targetReferencia = (formData.lugarReferencia || '').trim().toLowerCase();

    const existingRoute = routes.find(r => {
      const pMatch = (r.lugarPrincipal || '').trim().toLowerCase() === targetPrincipal;
      const rMatch = targetReferencia ? (r.lugarReferencia || '').trim().toLowerCase() === targetReferencia : true;
      return pMatch && rMatch;
    });

    if (existingRoute) {
      setNotification({
        type: 'error',
        text: `⚠️ No se puede guardar: Ya existe una ruta registrada para "${formData.lugarPrincipal.trim().toUpperCase()}" con la misma referencia "${formData.lugarReferencia.trim()}".`
      });
      setSaveLoading(false);
      return;
    }

    try {
      await saveRoute(formData, adminToken);
      setNotification({
        type: 'success',
        text: '¡Ruta guardada exitosamente!'
      });
      onRefreshRoutes();
      setTimeout(() => {
        setSelectedFile(null);
        setFilePreview(null);
        setActiveSubTab('list');
      }, 1200);
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Error al guardar la ruta'
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Abrir Modal de Edición de Ruta
  const handleStartEdit = (route) => {
    setEditingRoute(route);
    setEditFormData({
      lugarPrincipal: route.lugarPrincipal || '',
      lugarReferencia: route.lugarReferencia || '',
      dias: route.dias || '',
      horario: route.horario || '',
      tipoPunto: route.tipoPunto || 'PUNTO DE ENTREGA',
      departamentoNombre: route.departamentoNombre || 'La Libertad',
      municipioNombre: route.municipioNombre || 'La Libertad Norte',
      distritoNombre: route.distritoNombre || 'San Pablo Tacachico',
      imagenUrl: route.imagenUrl || ''
    });
    setEditFilePreview(route.imagenUrl);
  };

  // Guardar Cambios de Ruta Editada
  const handleSaveEditedRoute = async (e) => {
    e.preventDefault();
    if (!editingRoute) return;
    setSaveLoading(true);
    setNotification({ type: '', text: '' });

    try {
      await updateRoute(editingRoute.id, editFormData, adminToken);
      setNotification({
        type: 'success',
        text: `¡Ruta "${editFormData.lugarPrincipal}" actualizada exitosamente!`
      });
      setEditingRoute(null);
      setEditFormData(null);
      onRefreshRoutes();
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Error al actualizar ruta: ' + err.message
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Eliminar Ruta
  const handleDeleteRoute = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta ruta?')) return;
    try {
      await deleteRoute(id, adminToken);
      onRefreshRoutes();
      setNotification({ type: 'success', text: '¡Ruta eliminada exitosamente!' });
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al eliminar: ' + err.message });
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) return;
    setLogoLoading(true);
    setNotification({ type: '', text: '' });
    try {
      const updatedConfig = await uploadLogo(logoPreview, logoFile?.name || 'logo.png');
      setNotification({ type: 'success', text: '¡Logo actualizado exitosamente en la base de datos y reflejado en todo el sitio!' });
      if (onConfigUpdated) onConfigUpdated(updatedConfig);
    } catch (err) {
      setNotification({ type: 'error', text: 'Error al actualizar el logo: ' + err.message });
    } finally {
      setLogoLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1680px', width: '95%', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem' }}>
      {/* Header Admin */}
      <div style={{
        background: 'var(--hero-gradient)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div>
          <div className="badge badge-crimson" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', marginBottom: '0.6rem' }}>
            <Sparkles size={14} /> Módulo de Administración
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 900, lineHeight: 1.1 }}>
            Gestión de Rutas, Logo y Colores
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: '0.4rem', maxWidth: '650px', fontSize: '0.92rem' }}>
            Cargue y gestione el logo oficial en base de datos y administre los puntos de entrega en todo El Salvador.
          </p>
        </div>

        {/* Sub Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: 'max-content' }}>
          {isSocioRole ? (
            <button
              onClick={() => {
                setActiveSubTab('dispatch');
                loadPackages();
                loadSocios();
              }}
              className="btn btn-primary"
              style={{ flexGrow: 1, padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 800 }}
            >
              <Truck size={20} />
              Despacho y Entrega (Acceso Socio)
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveSubTab('upload')}
                className={activeSubTab === 'upload' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Upload size={18} />
                Nueva Ruta
              </button>
              <button
                onClick={() => setActiveSubTab('list')}
                className={activeSubTab === 'list' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Database size={18} />
                Mantenimiento ({routes.length})
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('sellers');
                  loadSellers();
                }}
                className={activeSubTab === 'sellers' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Users size={18} />
                Clientes Vendedores ({sellers.length})
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('socios');
                  loadSocios();
                  if (onRefreshRoutes) onRefreshRoutes();
                }}
                className={activeSubTab === 'socios' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Users size={18} />
                Socios / Repartidores ({socios.length})
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('packages');
                  loadPackages();
                  loadSellers();
                }}
                className={activeSubTab === 'packages' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Package size={18} />
                Ingreso de Paquetes (Casillero)
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('dispatch');
                  loadPackages();
                }}
                className={activeSubTab === 'dispatch' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <Truck size={18} />
                Despacho y Entrega
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('settlement');
                  loadPackages();
                  loadPlanillas();
                }}
                className={activeSubTab === 'settlement' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <DollarSign size={18} />
                Liquidación y Planillas
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('dashboard');
                  loadPackages();
                  loadPlanillas();
                }}
                className={activeSubTab === 'dashboard' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <BarChart3 size={18} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveSubTab('config')}
                className={activeSubTab === 'config' ? 'btn btn-primary' : 'btn btn-outline-white'}
                style={{ flexGrow: 1 }}
              >
                <ImageIcon size={18} />
                Logo y Marca
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification.text && (
        <div style={{
          background: notification.type === 'success' ? '#f0fdf4' : notification.type === 'info' ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : notification.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          color: notification.type === 'success' ? '#15803d' : notification.type === 'info' ? '#1d4ed8' : '#dc2626',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.95rem',
          fontWeight: 700
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* TAB 1: CARGA E IA VISION */}
      {activeSubTab === 'upload' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {/* Left: Image Upload Dropzone */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={22} /> 1. Subir Imagen Publicitaria
            </h3>

            <div style={{
              border: '2.5px dashed var(--primary-burgundy)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              textAlign: 'center',
              background: 'rgba(107, 0, 56, 0.02)',
              cursor: 'pointer',
              marginBottom: '1.5rem'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                id="file-upload-input"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Vista previa"
                    style={{
                      maxHeight: '260px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  />
                ) : (
                  <>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'rgba(107,0,56,0.08)',
                      color: 'var(--primary-burgundy)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <ImageIcon size={28} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-burgundy)' }}>
                      Haga clic o arrastre una imagen aquí
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Formatos soportados: JPG, PNG, WEBP (Banners de Amairany Express)
                    </div>
                  </>
                )}
              </label>
            </div>

            <button
              onClick={handleProcessImageAI}
              disabled={!selectedFile || analyzing}
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                opacity: !selectedFile || analyzing ? 0.6 : 1
              }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Escaneando datos de la imagen...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Extraer Datos de la Imagen
                </>
              )}
            </button>
          </div>

          {/* Right: Extracted Fields & Save Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit3 size={22} /> 2. Campos Extraídos y Organización
            </h3>

            <form onSubmit={handleSaveRoute} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Lugar Principal (Letras más negritas) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: SAN PABLO TACACHICO, LA UNIÓN"
                  value={formData.lugarPrincipal}
                  onChange={(e) => setFormData(prev => ({ ...prev, lugarPrincipal: e.target.value }))}
                  className="input-control"
                  style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-burgundy)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Día(s) de Atención *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: LUNES Y JUEVES"
                    value={formData.dias}
                    onChange={(e) => setFormData(prev => ({ ...prev, dias: e.target.value }))}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Horarios *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 8:00 A.M - 8:30 A.M"
                    value={formData.horario}
                    onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                    className="input-control"
                  />
                </div>
              </div>


              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  Lugar de Referencia / Dirección Exacta *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej: PARQUE CENTRAL FRENTE AL INSTITUTO CATÓLICO SAN PABLO APÓSTOL"
                  value={formData.lugarReferencia}
                  onChange={(e) => setFormData(prev => ({ ...prev, lugarReferencia: e.target.value }))}
                  className="input-control"
                />
              </div>

              {/* Organización Territorial El Salvador */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--primary-burgundy)', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={16} /> Organización Territorial El Salvador
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Departamento:</label>
                    <select
                      value={formData.departamentoNombre}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const deptObj = elSalvadorData.find(d => d.departamento === newDept);
                        const firstMun = deptObj?.municipios[0]?.nombre || '';
                        const firstDist = deptObj?.municipios[0]?.distritos[0] || '';
                        setFormData(prev => ({
                          ...prev,
                          departamentoNombre: newDept,
                          municipioNombre: firstMun,
                          distritoNombre: firstDist
                        }));
                      }}
                      className="select-control"
                    >
                      {elSalvadorData.map(d => (
                        <option key={d.departamento} value={d.departamento}>{d.departamento}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Municipio:</label>
                    <select
                      value={formData.municipioNombre}
                      onChange={(e) => {
                        const newMun = e.target.value;
                        const munObj = municipiosList.find(m => m.nombre === newMun);
                        const firstDist = munObj?.distritos[0] || '';
                        setFormData(prev => ({
                          ...prev,
                          municipioNombre: newMun,
                          distritoNombre: firstDist
                        }));
                      }}
                      className="select-control"
                    >
                      {municipiosList.map(m => (
                        <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Distrito:</label>
                    <select
                      value={formData.distritoNombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, distritoNombre: e.target.value }))}
                      className="select-control"
                    >
                      {distritosList.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', marginTop: '0.5rem' }}
              >
                {saveLoading ? 'Guardando Ruta...' : 'Guardar y Publicar Ruta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MANTENIMIENTO DE RUTAS EXISTENTES */}
      {activeSubTab === 'list' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
              Rutas y Sitios Registrados ({routes.length})
            </h3>
            <button
              onClick={onRefreshRoutes}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <RefreshCw size={16} /> Recargar Lista
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(107, 0, 56, 0.08)', color: 'var(--primary-burgundy)', borderBottom: '2px solid var(--primary-burgundy)' }}>
                  <th style={{ padding: '1rem' }}>Código</th>
                  <th style={{ padding: '1rem' }}>Imagen</th>
                  <th style={{ padding: '1rem' }}>Lugar Principal</th>
                  <th style={{ padding: '1rem' }}>Días y Horarios</th>
                  <th style={{ padding: '1rem' }}>Lugar de Referencia</th>
                  <th style={{ padding: '1rem' }}>Organización Territorial</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, idx) => {
                  const imgSrc = getRouteImageSrc(r.imagenUrl, r.lugarPrincipal);

                  return (
                    <tr key={r.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={{ background: 'var(--primary-burgundy)', color: '#ffffff', fontWeight: 800 }}>
                          {r.codigo || 'R-###'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <img
                          src={imgSrc}
                          alt={r.lugarPrincipal}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getRouteImageSrc('', r.lugarPrincipal);
                          }}
                          style={{ width: '70px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong className="lugar-principal-bold" style={{ fontSize: '1.05rem' }}>
                          {r.lugarPrincipal}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-crimson)', fontWeight: 800 }}>
                          {r.tipoPunto || 'PUNTO DE ENTREGA'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--primary-burgundy)' }}>{r.dias}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.horario}</div>
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '280px', color: '#475569' }}>
                        {r.lugarReferencia}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        <div><strong>Dep:</strong> {r.departamentoNombre}</div>
                        <div><strong>Mun:</strong> {r.municipioNombre}</div>
                        <div><strong>Dist:</strong> {r.distritoNombre}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          {/* BOTÓN EDITAR SOLICITADO */}
                          <button
                            onClick={() => handleStartEdit(r)}
                            style={{
                              background: 'var(--accent-gradient)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.5.rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              boxShadow: '0 2px 8px rgba(107, 0, 56, 0.2)'
                            }}
                          >
                            <Edit3 size={14} /> Editar
                          </button>

                          {/* BOTÓN ELIMINAR */}
                          <button
                            onClick={() => handleDeleteRoute(r.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CLIENTES VENDEDORES */}
      {activeSubTab === 'sellers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Formulario de Registro de Nuevo Vendedor */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <UserPlus size={24} /> Registrar Nuevo Cliente / Vendedor
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Ingrese los datos principales del cliente o tienda para guardarlo en la base de datos.
            </p>

            <form onSubmit={handleCreateSeller} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Elena Rodríguez"
                  value={sellerFormData.nombre}
                  onChange={(e) => setSellerFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  DUI*
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="00000000-0"
                  value={sellerFormData.dui}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                    const formatted = raw.length > 8 ? `${raw.slice(0, 8)}-${raw.slice(8)}` : raw;
                    setSellerFormData(prev => ({ ...prev, dui: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Nombre de Tienda / Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calzado & Moda María"
                  value={sellerFormData.tienda}
                  onChange={(e) => setSellerFormData(prev => ({ ...prev, tienda: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="vendedor@ejemplo.com"
                  value={sellerFormData.correo}
                  onChange={(e) => setSellerFormData(prev => ({ ...prev, correo: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  WhatsApp / Teléfono*
                </label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  placeholder="7788-9900"
                  value={sellerFormData.whatsapp}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
                    setSellerFormData(prev => ({ ...prev, whatsapp: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Cuenta Banco Agrícola (Numérica) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 3450987654"
                  value={sellerFormData.cuentaBancoAgricola}
                  onChange={(e) => {
                    const numOnly = e.target.value.replace(/\D/g, '');
                    setSellerFormData(prev => ({ ...prev, cuentaBancoAgricola: numOnly }));
                  }}
                  className="input-control"
                />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                >
                  {saveLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saveLoading ? 'Guardando Cliente...' : 'Guardar Cliente Vendedor'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Vendedores y Filtro de Búsqueda */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                  Directorio de Clientes Vendedores ({sellers.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Búsqueda y mantenimiento general de vendedores.
                </p>
              </div>

              {/* Filtro de Búsqueda */}
              <div style={{ position: 'relative', minWidth: '300px', flexGrow: 1, maxWidth: '450px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, Tienda, Teléfono o DUI..."
                  value={sellerSearch}
                  onChange={(e) => {
                    setSellerSearch(e.target.value);
                    loadSellers(e.target.value);
                  }}
                  className="input-control"
                  style={{ paddingLeft: '2.6rem' }}
                />
              </div>
            </div>

            {/* Tabla de Vendedores */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(107, 0, 56, 0.08)', color: 'var(--primary-burgundy)', borderBottom: '2px solid var(--primary-burgundy)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Código</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Nombre / Tienda</th>
                    <th style={{ padding: '0.85rem 1rem' }}>DUI</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Contacto (WhatsApp / Correo)</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Banco Agrícola</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Estado</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Registro / Modificación</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        {sellersLoading ? 'Cargando clientes...' : 'No se encontraron clientes/vendedores registrados.'}
                      </td>
                    </tr>
                  ) : (
                    sellers.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="badge" style={{ background: 'var(--accent-gradient)', color: '#ffffff', fontWeight: 800 }}>
                            {s.codigo || 'V-###'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--primary-burgundy)' }}>{s.nombre}</strong>
                          {s.tienda && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-crimson)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Store size={12} /> {s.tienda}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{s.dui || 'N/A'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {s.whatsapp && <div style={{ fontWeight: 700, color: '#16a34a' }}>💬 {s.whatsapp}</div>}
                          {s.correo && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {s.correo}</div>}
                          {!s.whatsapp && !s.correo && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1e3a8a' }}>
                          {s.cuentaBancoAgricola ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CreditCard size={14} /> {s.cuentaBancoAgricola}
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: s.estado === 'INACTIVO' ? '#fee2e2' : '#dcfce7',
                            color: s.estado === 'INACTIVO' ? '#dc2626' : '#166534'
                          }}>
                            {s.estado || 'ACTIVO'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                          <div><strong>Registro:</strong> {new Date(s.createdAt).toLocaleDateString('es-SV')}</div>
                          <div><strong>Modificado:</strong> {new Date(s.updatedAt).toLocaleDateString('es-SV')}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleStartEditSeller(s)}
                              style={{
                                background: 'var(--accent-gradient)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.4rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteSeller(s.id)}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                padding: '0.4rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SOCIOS / REPARTIDORES CON RUTA */}
      {activeSubTab === 'socios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Formulario de Registro de Nuevo Socio */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <UserPlus size={24} /> Registrar Nuevo Socio / Repartidor
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Cada socio registrado obtendrá automáticamente un código único correlativo de formato <strong>S-###</strong> (3 posiciones únicas) y tendrá una ruta asignada.
            </p>

            <form onSubmit={handleCreateSocio} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Nombre Completo del Socio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Alberto Mendoza"
                  value={socioFormData.nombre}
                  onChange={(e) => setSocioFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="7788-9900"
                  maxLength={9}
                  value={socioFormData.telefono}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
                    setSocioFormData(prev => ({ ...prev, telefono: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="socio@amairanyexpress.com"
                  value={socioFormData.correo}
                  onChange={(e) => setSocioFormData(prev => ({ ...prev, correo: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  DUI (Documento Único de Identidad)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="00000000-0"
                  value={socioFormData.dui}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                    const formatted = raw.length > 8 ? `${raw.slice(0, 8)}-${raw.slice(8)}` : raw;
                    setSocioFormData(prev => ({ ...prev, dui: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.7)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-burgundy)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📌 Rutas Asignadas (Seleccione una o varias rutas) *
                  </label>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {socioFormData.rutas?.length || 0} asignada(s) de {routes?.length || 0} rutas
                  </div>
                </div>

                {/* Buscador de rutas por código o por nombre */}
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="🔍 Buscar ruta por Código (R-###) o Municipio / Nombre (ej: NEJAPA, JAYAQUE)..."
                    value={socioRouteFilter}
                    onChange={(e) => setSocioRouteFilter(e.target.value)}
                    className="input-control"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.84rem', height: '40px', background: '#ffffff' }}
                  />
                  {socioRouteFilter && (
                    <button
                      type="button"
                      onClick={() => setSocioRouteFilter('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 800 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Rutas Seleccionadas Actualmente */}
                {socioFormData.rutas && socioFormData.rutas.length > 0 && (
                  <div style={{ marginBottom: '0.75rem', padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                        ✓ Rutas Seleccionadas ({socioFormData.rutas.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => clearAllSelectedRoutes(false)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Limpiar selección
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {socioFormData.rutas.map(rCode => (
                        <span
                          key={rCode}
                          style={{
                            background: 'var(--primary-burgundy)',
                            color: '#ffffff',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          📌 {rCode}
                          <span
                            onClick={() => removeSelectedRoute(rCode, false)}
                            style={{ cursor: 'pointer', paddingLeft: '0.2rem', opacity: 0.8 }}
                            title="Quitar esta ruta"
                          >
                            ✕
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista Scrollable de Rutas Filtradas */}
                <div style={{
                  maxHeight: '190px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  background: '#ffffff',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem'
                }}>
                  {(() => {
                    const filterTerm = socioRouteFilter.trim().toLowerCase();
                    const filtered = routes ? routes.filter(r => {
                      if (!filterTerm) return true;
                      const code = (r.codigo || '').toLowerCase();
                      const principal = (r.lugarPrincipal || '').toLowerCase();
                      const ref = (r.lugarReferencia || '').toLowerCase();
                      const dias = (r.dias || '').toLowerCase();
                      return code.includes(filterTerm) || principal.includes(filterTerm) || ref.includes(filterTerm) || dias.includes(filterTerm);
                    }) : [];

                    if (filtered.length === 0) {
                      return (
                        <div style={{ width: '100%', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          No se encontraron rutas que coincidan con "{socioRouteFilter}".
                        </div>
                      );
                    }

                    return filtered.map(r => {
                      const rCode = r.codigo || r.lugarPrincipal;
                      const isSelected = (socioFormData.rutas || []).includes(rCode);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => toggleRouteForSocio(rCode, false)}
                          style={{
                            padding: '0.45rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid var(--primary-burgundy)' : '1px solid #cbd5e1',
                            background: isSelected ? 'var(--primary-burgundy)' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected ? '✓' : '+'} {r.codigo ? `[${r.codigo}] ` : ''}{r.lugarPrincipal}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                >
                  {saveLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saveLoading ? 'Guardando Socio...' : 'Registrar Socio con Código S-### y Rutas'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Socios */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                  Directorio de Socios / Repartidores ({socios.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Listado de socios registrados con su código único de socio (S-###) y ruta asignada.
                </p>
              </div>

              <div style={{ position: 'relative', minWidth: '300px', flexGrow: 1, maxWidth: '450px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar socio por Código (S-###), Nombre, DUI o Ruta..."
                  value={socioSearch}
                  onChange={(e) => {
                    setSocioSearch(e.target.value);
                    loadSocios(e.target.value);
                  }}
                  className="input-control"
                  style={{ paddingLeft: '2.6rem' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(107, 0, 56, 0.08)', color: 'var(--primary-burgundy)', borderBottom: '2px solid var(--primary-burgundy)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Código Socio</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Nombre Completo</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Contacto (Teléfono / Correo)</th>
                    <th style={{ padding: '0.85rem 1rem' }}>DUI</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Ruta Asignada</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {socios.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        {sociosLoading ? 'Cargando socios...' : 'No se encontraron socios registrados.'}
                      </td>
                    </tr>
                  ) : (
                    socios.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="badge" style={{ background: 'var(--primary-burgundy)', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                            {s.codigo || 'S-###'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--primary-burgundy)' }}>{s.nombre}</strong>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {s.telefono && <div style={{ fontWeight: 700, color: '#16a34a' }}>📞 {s.telefono}</div>}
                          {s.correo && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {s.correo}</div>}
                          {!s.telefono && !s.correo && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{s.dui || 'N/A'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {(() => {
                            const raw = s.rutas || s.ruta || '';
                            const assignedList = raw.split(',').map(r => r.trim()).filter(Boolean);
                            if (assignedList.length === 0) {
                              return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sin Rutas</span>;
                            }
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {assignedList.map((rCode, i) => (
                                  <span key={i} className="badge" style={{ background: 'var(--accent-gradient)', color: '#ffffff', fontWeight: 800, fontSize: '0.78rem' }}>
                                    📌 {rCode}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleStartEditSocio(s)}
                              style={{
                                background: 'var(--accent-gradient)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.4rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteSocio(s.id)}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                padding: '0.4rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Socio */}
      {editingSocio && editSocioFormData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: '#ffffff', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                Editar Socio [{editSocioFormData.codigo}]
              </h3>
              <button onClick={() => setEditingSocio(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSocio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editSocioFormData.nombre}
                  onChange={(e) => setEditSocioFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={editSocioFormData.telefono}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
                    setEditSocioFormData(prev => ({ ...prev, telefono: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editSocioFormData.correo}
                  onChange={(e) => setEditSocioFormData(prev => ({ ...prev, correo: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  DUI
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={editSocioFormData.dui}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                    const formatted = raw.length > 8 ? `${raw.slice(0, 8)}-${raw.slice(8)}` : raw;
                    setEditSocioFormData(prev => ({ ...prev, dui: formatted }));
                  }}
                  className="input-control"
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📌 Rutas Asignadas (Seleccione una o varias rutas)
                  </label>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {editSocioFormData.rutas?.length || 0} asignada(s) de {routes?.length || 0} rutas
                  </div>
                </div>

                {/* Buscador de rutas por código o por nombre */}
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="🔍 Buscar por Código (R-###) o Municipio / Nombre..."
                    value={editSocioRouteFilter}
                    onChange={(e) => setEditSocioRouteFilter(e.target.value)}
                    className="input-control"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.82rem', height: '38px', background: '#ffffff' }}
                  />
                  {editSocioRouteFilter && (
                    <button
                      type="button"
                      onClick={() => setEditSocioRouteFilter('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 800 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Rutas Seleccionadas Actualmente */}
                {editSocioFormData.rutas && editSocioFormData.rutas.length > 0 && (
                  <div style={{ marginBottom: '0.6rem', padding: '0.55rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                        ✓ Rutas Seleccionadas ({editSocioFormData.rutas.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => clearAllSelectedRoutes(true)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Limpiar selección
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {editSocioFormData.rutas.map(rCode => (
                        <span
                          key={rCode}
                          style={{
                            background: 'var(--primary-burgundy)',
                            color: '#ffffff',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          📌 {rCode}
                          <span
                            onClick={() => removeSelectedRoute(rCode, true)}
                            style={{ cursor: 'pointer', paddingLeft: '0.2rem', opacity: 0.8 }}
                            title="Quitar esta ruta"
                          >
                            ✕
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista Scrollable de Rutas Filtradas */}
                <div style={{
                  maxHeight: '170px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem',
                  background: '#ffffff',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem'
                }}>
                  {(() => {
                    const filterTerm = editSocioRouteFilter.trim().toLowerCase();
                    const filtered = routes ? routes.filter(r => {
                      if (!filterTerm) return true;
                      const code = (r.codigo || '').toLowerCase();
                      const principal = (r.lugarPrincipal || '').toLowerCase();
                      const ref = (r.lugarReferencia || '').toLowerCase();
                      const dias = (r.dias || '').toLowerCase();
                      return code.includes(filterTerm) || principal.includes(filterTerm) || ref.includes(filterTerm) || dias.includes(filterTerm);
                    }) : [];

                    if (filtered.length === 0) {
                      return (
                        <div style={{ width: '100%', textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No se encontraron rutas que coincidan con "{editSocioRouteFilter}".
                        </div>
                      );
                    }

                    return filtered.map(r => {
                      const rCode = r.codigo || r.lugarPrincipal;
                      const isSelected = (editSocioFormData.rutas || []).includes(rCode);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => toggleRouteForSocio(rCode, true)}
                          style={{
                            padding: '0.4rem 0.7rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid var(--primary-burgundy)' : '1px solid #cbd5e1',
                            background: isSelected ? 'var(--primary-burgundy)' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected ? '✓' : '+'} {r.codigo ? `[${r.codigo}] ` : ''}{r.lugarPrincipal}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingSocio(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saveLoading} className="btn btn-primary" style={{ flex: 1 }}>
                  {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: INGRESO DE PAQUETES (CASILLERO) */}
      {activeSubTab === 'packages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Layout 2 Columnas (Estilo Rutas) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
            alignItems: 'start',
            position: 'relative'
          }}>

            {/* BLOCK UI / OVERLAY DE CARGA Y PROCESAMIENTO VISUAL */}
            {packageAnalyzing && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(76, 0, 112, 0.88)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '2rem',
                color: '#ffffff',
                textAlign: 'center',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <div style={{
                  position: 'relative',
                  width: '84px',
                  height: '84px',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '4px solid rgba(255, 255, 255, 0.2)',
                    borderTopColor: '#ED0047',
                    borderRightColor: '#FF2A6D',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: '12px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={30} color="#ffffff" />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.6rem', color: '#ffffff', letterSpacing: '0.3px' }}>
                  Escaneando e Interpretando la Fotografía...
                </h3>
                
                <p style={{ color: 'rgba(255, 255, 255, 0.92)', fontSize: '0.94rem', maxWidth: '440px', lineHeight: 1.55, margin: 0 }}>
                  Analizando datos de la etiqueta: cliente destinatario, dirección o ruta de entrega, vendedor emisor y montos en dólares.
                </p>

                <div style={{
                  marginTop: '1.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: 'rgba(255, 255, 255, 0.18)',
                  padding: '0.55rem 1.2rem',
                  borderRadius: '24px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Procesando, un momento por favor...
                </div>
              </div>
            )}
            
            {/* Columna Izquierda: Subir o Capturar Imagen */}
            <div style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Camera size={20} color="var(--primary-burgundy)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                  1. Subir o Capturar Imagen del Paquete / Guía
                </h3>
              </div>

              {/* Inputs ocultos para Cámara directa (Móvil) y Galería/Archivos */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePackageFileChange}
                id="package-camera-input"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handlePackageFileChange}
                id="package-gallery-input"
                style={{ display: 'none' }}
              />

              <div style={{
                border: '2px dashed var(--primary-burgundy)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
                background: '#FAF5FF',
                marginBottom: '1.25rem'
              }}>
                {packageFilePreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={packageFilePreview}
                      alt="Vista previa del paquete"
                      style={{
                        maxHeight: '220px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <label
                        htmlFor="package-camera-input"
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer' }}
                      >
                        <Camera size={16} /> Retomar Foto
                      </label>
                      <label
                        htmlFor="package-gallery-input"
                        className="btn"
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer', background: '#f1f5f9', color: 'var(--primary-burgundy)', border: '1px solid #cbd5e1' }}
                      >
                        <ImageIcon size={16} /> Cambiar Imagen
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'rgba(76, 0, 112, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem'
                    }}>
                      <Camera size={26} color="var(--primary-burgundy)" />
                    </div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Seleccione el origen de la imagen
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Admite fotos manuscritas de guías, recibos y etiquetas (JPG, PNG, WEBP)
                    </p>

                    {/* Botones duales para Móvil y PC */}
                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <label
                        htmlFor="package-camera-input"
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <Camera size={17} /> Tomar Foto (Cámara)
                      </label>

                      <label
                        htmlFor="package-gallery-input"
                        className="btn"
                        style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          background: '#f1f5f9',
                          color: 'var(--primary-burgundy)',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700
                        }}
                      >
                        <ImageIcon size={17} /> Abrir Galería / Archivos
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleProcessPackageAI}
                disabled={!packageFile || packageAnalyzing}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
              >
                <Sparkles size={18} />
                {packageAnalyzing ? 'Escaneando fotografía de la guía...' : 'Escanear y Extraer Datos de la Imagen'}
              </button>
            </div>

            {/* Columna Derecha: Formulario de Campos Extraídos */}
            <div style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Edit3 size={20} color="var(--primary-burgundy)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                  2. Campos Extraídos y Datos del Paquete
                </h3>
              </div>

              <form onSubmit={handleCreatePackage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Cliente (Destinatario) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Cliente (Destinatario que recibe) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: María Elena Rodríguez"
                    value={packageFormData.cliente}
                    onChange={(e) => setPackageFormData(prev => ({ ...prev, cliente: e.target.value }))}
                    className="input-control"
                  />
                </div>

                {/* Destino */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Destino (Dirección o Ruta de Entrega) *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      required
                      placeholder="Ej: SAN PABLO TACACHICO / Parque Central"
                      value={packageFormData.destino}
                      onChange={(e) => setPackageFormData(prev => ({ ...prev, destino: e.target.value }))}
                      className="input-control"
                      style={{ flexGrow: 1, minWidth: '220px' }}
                    />
                    {routes && routes.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexGrow: 1, maxWidth: '280px' }}>
                        <input
                          type="text"
                          placeholder="🔍 Buscar ruta..."
                          value={routeFilterQuery}
                          onChange={(e) => setRouteFilterQuery(e.target.value)}
                          className="input-control"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', width: '110px' }}
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const selVal = e.target.value;
                              const matchedR = routes.find(r => `${r.lugarPrincipal}${r.lugarReferencia ? ' - ' + r.lugarReferencia : ''}` === selVal || r.lugarPrincipal === selVal);
                              const calculatedDate = matchedR && matchedR.dias ? calculateNextRouteDate(matchedR.dias) : formatDDMMYY(new Date());
                              setPackageFormData(prev => ({ ...prev, destino: selVal, fechaEntrega: calculatedDate }));
                            }
                          }}
                          className="select-control"
                          style={{ flexGrow: 1, fontSize: '0.8rem' }}
                        >
                          <option value="">Rutas ({routes.length})...</option>
                          {routes
                            .filter(r => {
                              if (!routeFilterQuery.trim()) return true;
                              const q = routeFilterQuery.toLowerCase();
                              return (r.lugarPrincipal || '').toLowerCase().includes(q) ||
                                     (r.lugarReferencia || '').toLowerCase().includes(q);
                            })
                            .map(r => (
                              <option key={r.id} value={`${r.lugarPrincipal}${r.lugarReferencia ? ' - ' + r.lugarReferencia : ''}`}>
                                {r.lugarPrincipal}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendedor / Tienda / Emisor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Vendedor / Tienda / Emisor *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {sellers && sellers.length > 0 && (
                      <input
                        type="text"
                        placeholder="🔍 Buscar vendedor o tienda..."
                        value={sellerFilterQuery}
                        onChange={(e) => setSellerFilterQuery(e.target.value)}
                        className="input-control"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#f8fafc' }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {sellers && sellers.length > 0 ? (
                        <select
                          value={packageFormData.vendedorNombre}
                          onChange={(e) => setPackageFormData(prev => ({ ...prev, vendedorNombre: e.target.value }))}
                          className="select-control"
                          style={{ flexGrow: 1 }}
                        >
                          <option value="">-- Seleccionar de Clientes Vendedores Activos --</option>
                          {sellers
                            .filter(s => s.estado === 'ACTIVO')
                            .filter(s => {
                              if (!sellerFilterQuery.trim()) return true;
                              const q = sellerFilterQuery.toLowerCase();
                              return (s.tienda || '').toLowerCase().includes(q) ||
                                     (s.nombre || '').toLowerCase().includes(q);
                            })
                            .map(s => {
                              const valStr = s.tienda ? `${s.tienda} (${s.nombre})` : s.nombre;
                              return (
                                <option key={s.id} value={valStr}>
                                  {s.tienda ? `${s.tienda} - ${s.nombre}` : s.nombre}
                                </option>
                              );
                            })
                          }
                          <option value="OTRO_DIRECTO">-- Escribir Nombre Personalizado --</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder="Ej: Calzado & Moda María"
                          value={packageFormData.vendedorNombre}
                          onChange={(e) => setPackageFormData(prev => ({ ...prev, vendedorNombre: e.target.value }))}
                          className="input-control"
                          style={{ flexGrow: 1 }}
                        />
                      )}

                      {(packageFormData.vendedorNombre === 'OTRO_DIRECTO' || (!sellers.some(s => (s.tienda ? `${s.tienda} (${s.nombre})` : s.nombre) === packageFormData.vendedorNombre) && !sellers.some(s => s.tienda === packageFormData.vendedorNombre))) && (
                        <input
                          type="text"
                          required
                          placeholder="Escriba el nombre del Vendedor/Tienda"
                          value={packageFormData.vendedorNombre === 'OTRO_DIRECTO' ? '' : packageFormData.vendedorNombre}
                          onChange={(e) => setPackageFormData(prev => ({ ...prev, vendedorNombre: e.target.value }))}
                          className="input-control"
                          style={{ flexGrow: 1 }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid para Precios: Valor, Envío y Total */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Valor ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={packageFormData.valor}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPackageFormData(prev => ({
                          ...prev,
                          valor: val,
                          total: +(val + (parseFloat(prev.envio) || 0)).toFixed(2)
                        }));
                      }}
                      className="input-control"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Envío ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={packageFormData.envio}
                      onChange={(e) => {
                        const env = parseFloat(e.target.value) || 0;
                        setPackageFormData(prev => ({
                          ...prev,
                          envio: env,
                          total: +((parseFloat(prev.valor) || 0) + env).toFixed(2)
                        }));
                      }}
                      className="input-control"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Total ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      readOnly
                      value={packageFormData.total}
                      className="input-control"
                      style={{ background: '#f8fafc', fontWeight: 900, color: 'var(--primary-burgundy)' }}
                    />
                  </div>
                </div>

                {/* Grid para Teléfono y Fecha de Entrega */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Teléfono / Contacto *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={9}
                      placeholder="7788-9900"
                      value={packageFormData.telefono}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 4) {
                          val = `${val.slice(0, 4)}-${val.slice(4, 8)}`;
                        }
                        setPackageFormData(prev => ({ ...prev, telefono: val }));
                      }}
                      className="input-control"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                      Fecha / Día de Entrega *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="dd/mm/yy"
                      value={packageFormData.fechaEntrega}
                      onChange={(e) => setPackageFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                      className="input-control"
                    />
                  </div>
                </div>

                {/* Tipo de Pago al Recepcionar */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.4rem' }}>
                    Tipo de Pago al Recepcionar *
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <label style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: packageFormData.tipoPago === 'EFECTIVO' ? '2px solid var(--primary-burgundy)' : '1px solid #cbd5e1',
                      background: packageFormData.tipoPago === 'EFECTIVO' ? '#FAF5FF' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: packageFormData.tipoPago === 'EFECTIVO' ? 'var(--primary-burgundy)' : '#475569'
                    }}>
                      <input
                        type="radio"
                        name="tipoPago"
                        value="EFECTIVO"
                        checked={packageFormData.tipoPago === 'EFECTIVO'}
                        onChange={(e) => setPackageFormData(prev => ({ ...prev, tipoPago: e.target.value }))}
                        style={{ accentColor: 'var(--primary-burgundy)' }}
                      />
                      💵 EFECTIVO
                    </label>

                    <label style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: packageFormData.tipoPago === 'TRANSFERENCIA' ? '2px solid var(--primary-burgundy)' : '1px solid #cbd5e1',
                      background: packageFormData.tipoPago === 'TRANSFERENCIA' ? '#FAF5FF' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: packageFormData.tipoPago === 'TRANSFERENCIA' ? 'var(--primary-burgundy)' : '#475569'
                    }}>
                      <input
                        type="radio"
                        name="tipoPago"
                        value="TRANSFERENCIA"
                        checked={packageFormData.tipoPago === 'TRANSFERENCIA'}
                        onChange={(e) => setPackageFormData(prev => ({ ...prev, tipoPago: e.target.value }))}
                        style={{ accentColor: 'var(--primary-burgundy)' }}
                      />
                      🏦 TRANSFERENCIA
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', marginTop: '0.5rem' }}
                >
                  <Package size={18} />
                  {saveLoading ? 'Recepcionando...' : 'Recepcionar Paquete'}
                </button>

                {/* NOTIFICACIÓN DIRECTA DEBAJO DEL BOTÓN PARA CONFIRMACIÓN INMEDIATA */}
                {notification && notification.text && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    background: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: notification.type === 'error' ? '#991b1b' : '#15803d',
                    border: notification.type === 'error' ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
                    lineHeight: 1.45
                  }}>
                    {notification.type === 'error' ? <AlertCircle size={22} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={22} style={{ flexShrink: 0 }} />}
                    <div>{notification.text}</div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Directorio de Paquetes Recepcionados */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                Paquetes Recepcionados en Casillero ({packages.filter(p => p.estado !== 'ENTREGADO').length})
              </h3>
              
              <div style={{ position: 'relative', minWidth: '280px', flexGrow: 1, maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar paquete por cliente, destino, vendedor o teléfono..."
                  value={packageSearch}
                  onChange={(e) => {
                    setPackageSearch(e.target.value);
                    loadPackages(e.target.value);
                  }}
                  className="input-control"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: 'var(--primary-burgundy)', fontWeight: 800 }}>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Código</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>F. Recepción</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>F. Entrega</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Cliente (Destinatario)</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Destino / Ruta</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Vendedor / Emisor</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Valor ($)</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Envío ($)</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Total ($)</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Contacto</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Tipo Pago</th>
                    <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Estado</th>
                    <th style={{ padding: '1rem 1.15rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const pendingPackages = packages.filter(p => p.estado !== 'ENTREGADO');
                    if (packagesLoading) {
                      return (
                        <tr>
                          <td colSpan="13" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Cargando paquetes en casillero...
                          </td>
                        </tr>
                      );
                    }
                    if (pendingPackages.length === 0) {
                      return (
                        <tr>
                          <td colSpan="13" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay paquetes pendientes de entrega en el casillero.
                          </td>
                        </tr>
                      );
                    }
                    return pendingPackages.map((pkg) => (
                      <tr key={pkg.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s ease' }}>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: '#FAF5FF',
                            color: 'var(--primary-burgundy)',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            border: '1.5px solid rgba(76,0,112,0.25)',
                            letterSpacing: '0.5px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {pkg.codigo || 'P-???'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {pkg.fechaRecepcion || new Date(pkg.createdAt).toLocaleDateString('es-SV')}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {pkg.fechaEntrega || '-'}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                          {pkg.cliente}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 600 }}>
                          {pkg.destino}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 700 }}>
                          {pkg.vendedorNombre}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          ${parseFloat(pkg.valor).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          ${parseFloat(pkg.envio).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', fontWeight: 900, color: 'var(--primary-burgundy)', whiteSpace: 'nowrap' }}>
                          ${parseFloat(pkg.total).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {pkg.telefono}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap',
                            background: pkg.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7',
                            color: pkg.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534'
                          }}>
                            {pkg.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            background: pkg.estado === 'RECEPCIONADO' ? '#e0f2fe' : '#dcfce7',
                            color: pkg.estado === 'RECEPCIONADO' ? '#0369a1' : '#15803d'
                          }}>
                            {pkg.estado}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setViewingPackage(pkg)}
                              title="Ver detalles e imagen"
                              style={{
                                background: '#e0f2fe',
                                color: '#0284c7',
                                border: 'none',
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Eye size={14} /> Ver
                            </button>

                            <button
                              onClick={() => handleOpenEditPackage(pkg)}
                              title="Editar datos del paquete"
                              style={{
                                background: '#fef3c7',
                                color: '#d97706',
                                border: 'none',
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Edit3 size={14} /> Editar
                            </button>

                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              title="Eliminar paquete"
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SECCIÓN 5: DESPACHO Y ENTREGA DE PAQUETES */}
      {activeSubTab === 'dispatch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Informativo */}
          <div style={{
            background: 'linear-gradient(135deg, #4C0070 0%, #2A0040 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            color: '#ffffff',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '50%' }}>
                <Truck size={24} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                  Despacho y Entrega de Paquetes
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                  Ingrese o escanee el código correlativo de paquete (Ej: P-XXXXX) para ver su ficha de recepción, cargar la fotografía de entrega y marcarlo como ENTREGADO.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de Búsqueda de Código */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} /> 1. Buscar Paquete por Código Correlativo
            </h3>

            <form onSubmit={handleSearchPackageForDispatch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flexGrow: 1, minWidth: '280px', position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="Ingrese el Código del Paquete (Ej: P-A1B2C)..."
                  value={dispatchCodeSearch}
                  onChange={(e) => setDispatchCodeSearch(e.target.value.toUpperCase())}
                  className="input-control"
                  style={{
                    paddingLeft: '2.5rem',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    background: '#faf5ff',
                    borderColor: 'var(--primary-burgundy)'
                  }}
                />
                <Package size={20} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-burgundy)' }} />
              </div>

              <button
                type="submit"
                disabled={dispatchSearchLoading}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
              >
                <Search size={18} />
                {dispatchSearchLoading ? 'Buscando...' : 'Buscar Paquete'}
              </button>

              {/* Dropdown de Selección Rápida para Recepcionados Pendientes */}
              {(() => {
                const currentSocio = isSocioRole ? socios.find(s => (s.correo || '').toLowerCase().trim() === (adminUser?.email || '').toLowerCase().trim()) : null;
                const socioRoutesList = currentSocio ? (currentSocio.rutas || currentSocio.ruta || '').split(',').map(r => r.trim()).filter(Boolean) : [];
                const filteredDispatchPackages = (packages || []).filter(p => {
                  if (p.estado !== 'RECEPCIONADO') return false;
                  if (p.fechaEntrega && !isDateTodayOrFuture(p.fechaEntrega)) return false;
                  if (isSocioRole) {
                    return checkPackageBelongsToSocio(p, socioRoutesList, routes);
                  }
                  return true;
                });

                return filteredDispatchPackages.length > 0 ? (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setDispatchCodeSearch(e.target.value);
                        const found = filteredDispatchPackages.find(p => p.codigo === e.target.value);
                        if (found) {
                          setDispatchPackage(found);
                          setDispatchNotification({ type: 'success', text: `¡Paquete ${found.codigo} seleccionado!` });
                        }
                      }
                    }}
                    className="select-control"
                    style={{ width: 'auto', minWidth: '240px', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Paquetes Pendientes ({filteredDispatchPackages.length}) --</option>
                    {filteredDispatchPackages.map(p => (
                      <option key={p.id} value={p.codigo}>
                        {p.codigo} - {p.cliente} ({p.destino}) - Fecha: {p.fechaEntrega || 'Pendiente'}
                      </option>
                    ))}
                  </select>
                ) : null;
              })()}
            </form>
          </div>

          {/* Tabla de Paquetes Asignados de la Ruta del Socio */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            {(() => {
              const currentSocio = isSocioRole ? socios.find(s => (s.correo || '').toLowerCase().trim() === (adminUser?.email || '').toLowerCase().trim()) : null;
              const socioRoutesList = currentSocio ? (currentSocio.rutas || currentSocio.ruta || '').split(',').map(r => r.trim()).filter(Boolean) : [];
              const filteredDispatchPackages = (packages || []).filter(p => {
                if (p.estado !== 'RECEPCIONADO') return false;
                if (p.fechaEntrega && !isDateTodayOrFuture(p.fechaEntrega)) return false;
                if (isSocioRole) {
                  return checkPackageBelongsToSocio(p, socioRoutesList, routes);
                }
                return true;
              });

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-burgundy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={20} />
                        {isSocioRole 
                          ? `Paquetes Asignados a tu Ruta (${filteredDispatchPackages.length})` 
                          : `Paquetes Recepcionados Listos para Despacho (${filteredDispatchPackages.length})`}
                      </h3>
                      {isSocioRole && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>
                          Socio: <strong>{currentSocio ? currentSocio.nombre : (adminUser?.name || adminUser?.email)}</strong> | Rutas: <strong>{socioRoutesList.join(', ') || 'Sin rutas'}</strong>
                        </p>
                      )}
                    </div>

                    <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
                      📅 Fechas Válidas (Hoy y Futuras)
                    </span>
                  </div>

                  {filteredDispatchPackages.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                      <Truck size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <p style={{ fontWeight: 700, margin: 0 }}>No hay paquetes recepcionados pendientes asignados a tu ruta.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(107, 0, 56, 0.08)', color: 'var(--primary-burgundy)', borderBottom: '2px solid var(--primary-burgundy)' }}>
                            <th style={{ padding: '0.75rem 1rem' }}>Código</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Cliente (Destinatario)</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Destino / Ruta</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Fecha Entrega</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Total ($)</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDispatchPackages.map(pkg => (
                            <tr key={pkg.id} style={{ borderBottom: '1px solid #e2e8f0', background: dispatchPackage?.id === pkg.id ? '#faf5ff' : 'transparent' }}>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span className="badge" style={{ background: 'var(--accent-gradient)', color: '#fff', fontWeight: 800 }}>
                                  {pkg.codigo}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-burgundy)' }}>
                                {pkg.cliente}
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>Tel: {pkg.telefono}</div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>{pkg.destino}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontWeight: 800, fontSize: '0.8rem' }}>
                                  📅 {pkg.fechaEntrega || 'Hoy'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                                ${(parseFloat(pkg.total) || 0).toFixed(2)} ({pkg.tipoPago})
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setDispatchCodeSearch(pkg.codigo);
                                    setDispatchPackage(pkg);
                                    setDispatchNotification({ type: 'success', text: `¡Paquete ${pkg.codigo} seleccionado para entrega!` });
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                >
                                  <Truck size={14} /> Seleccionar y Entregar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Ficha y Formulario de Entrega si el Paquete fue Encontrado */}
          {dispatchPackage && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.75rem',
              alignItems: 'start'
            }}>
              
              {/* Columna Izquierda: Datos del Paquete Recepcionado e Imagen de Guía */}
              <div style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Box size={20} color="var(--primary-burgundy)" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                      Ficha del Paquete Recepcionado
                    </h3>
                  </div>
                  <span style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    background: dispatchPackage.estado === 'ENTREGADO' ? '#dcfce7' : '#e0f2fe',
                    color: dispatchPackage.estado === 'ENTREGADO' ? '#15803d' : '#0369a1',
                    border: dispatchPackage.estado === 'ENTREGADO' ? '1px solid #86efac' : '1px solid #7dd3fc'
                  }}>
                    {dispatchPackage.estado === 'ENTREGADO' ? '✅ ENTREGADO' : '📦 RECEPCIONADO'}
                  </span>
                </div>

                {/* Código del Paquete destacado */}
                <div style={{
                  background: 'var(--hero-gradient)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px', fontWeight: 700 }}>
                    Código de Paquete
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '2px', marginTop: '0.2rem' }}>
                    {dispatchPackage.codigo || 'SIN CÓDIGO'}
                  </div>
                </div>

                {/* Grid de detalles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', fontWeight: 700 }}>CLIENTE DESTINATARIO</span>
                    <strong style={{ color: 'var(--primary-burgundy)', fontSize: '1rem' }}>{dispatchPackage.cliente}</strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', fontWeight: 700 }}>DESTINO / RUTA</span>
                    <strong style={{ color: '#334155' }}>📍 {dispatchPackage.destino}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 700 }}>VENDEDOR / EMISOR</span>
                      <strong style={{ color: '#334155', fontSize: '0.85rem' }}>🏪 {dispatchPackage.vendedorNombre}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 700 }}>TELÉFONO</span>
                      <strong style={{ color: '#334155', fontSize: '0.85rem' }}>📞 {dispatchPackage.telefono}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#FAF5FF', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(76,0,112,0.15)' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>VALOR</span>
                      <strong style={{ color: '#0f172a' }}>${(dispatchPackage.valor || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>ENVÍO</span>
                      <strong style={{ color: '#0f172a' }}>${(dispatchPackage.envio || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>TOTAL</span>
                      <strong style={{ color: 'var(--primary-burgundy)', fontSize: '1.05rem', fontWeight: 900 }}>${(dispatchPackage.total || 0).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 700 }}>TIPO DE PAGO</span>
                      <strong style={{ color: '#334155', fontSize: '0.85rem' }}>
                        {dispatchPackage.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                      </strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 700 }}>FECHA ENTREGA</span>
                      <strong style={{ color: '#334155', fontSize: '0.85rem' }}>📅 {dispatchPackage.fechaEntrega}</strong>
                    </div>
                  </div>
                </div>

                {/* Fotografía de Recepción */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-burgundy)', margin: 0 }}>
                      Fotografía de Recepción (Guía)
                    </h4>
                    <label
                      htmlFor={`reception-update-file-${dispatchPackage.id}`}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--primary-burgundy)',
                        background: '#faf5ff',
                        border: '1px solid var(--primary-burgundy)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                      title="Adjuntar o cambiar fotografía de recepción"
                    >
                      <Camera size={13} /> {dispatchPackage.imagenUrl ? 'Cambiar Foto' : 'Adjuntar Foto'}
                    </label>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    id={`reception-update-file-${dispatchPackage.id}`}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && dispatchPackage) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const b64 = reader.result;
                          try {
                            await updatePackage(dispatchPackage.id, { imagenUrl: b64 }, adminToken);
                            setDispatchPackage(prev => ({ ...prev, imagenUrl: b64 }));
                            setDispatchNotification({ type: 'success', text: '¡Fotografía de recepción guardada de forma permanente!' });
                            loadPackages();
                          } catch (err) {
                            setDispatchNotification({ type: 'error', text: 'Error al actualizar fotografía: ' + err.message });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {dispatchPackage.imagenUrl ? (
                    <img
                      src={getPackageImageSrc(dispatchPackage.imagenUrl)}
                      alt="Guía de Recepción"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const fallbackEl = document.getElementById(`fallback-disp-img-${dispatchPackage.id}`);
                        if (fallbackEl) fallbackEl.style.display = 'block';
                      }}
                      style={{
                        width: '100%',
                        maxHeight: '220px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff'
                      }}
                    />
                  ) : null}

                  <div
                    id={`fallback-disp-img-${dispatchPackage.id}`}
                    style={{
                      display: (!dispatchPackage.imagenUrl) ? 'block' : 'none',
                      padding: '1.25rem',
                      background: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      border: '1px dashed #cbd5e1'
                    }}
                  >
                    <ImageIcon size={32} style={{ display: 'block', margin: '0 auto 0.4rem', opacity: 0.4 }} />
                    Fotografía no disponible. Puede presionar <strong>"Adjuntar Foto"</strong> arriba para cargar la guía.
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Registrar Entrega / Capturar Foto Comprobante */}
              <div style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <Camera size={20} color="var(--primary-burgundy)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                    2. Comprobante de Entrega / Despacho
                  </h3>
                </div>

                <form onSubmit={handleConfirmDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Inputs Ocultos de Cámara y Galería para Fotografía de Entrega */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDeliveryFileChange}
                    id="delivery-camera-input"
                    style={{ display: 'none' }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDeliveryFileChange}
                    id="delivery-gallery-input"
                    style={{ display: 'none' }}
                  />

                  {/* Contenedor de Fotografía de Entrega */}
                  <div style={{
                    border: '2px dashed var(--primary-burgundy)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                    background: '#FAF5FF'
                  }}>
                    {(deliveryFilePreview || dispatchPackage.imagenEntregaUrl) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                        <img
                          src={deliveryFilePreview || getPackageImageSrc(dispatchPackage.imagenEntregaUrl)}
                          alt="Vista previa del comprobante de entrega"
                          style={{
                            maxHeight: '260px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: 'var(--shadow-sm)',
                            background: '#ffffff'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <label
                            htmlFor="delivery-camera-input"
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer' }}
                          >
                            <Camera size={16} /> Retomar Foto
                          </label>
                          <label
                            htmlFor="delivery-gallery-input"
                            className="btn"
                            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer', background: '#f1f5f9', color: 'var(--primary-burgundy)', border: '1px solid #cbd5e1' }}
                          >
                            <ImageIcon size={16} /> Cambiar Foto
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(76, 0, 112, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.75rem'
                        }}>
                          <Camera size={28} color="var(--primary-burgundy)" />
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                          Fotografía de Entrega al Cliente
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                          Tome una foto de la entrega en punto o adjunte el comprobante firmado (Cámara o Galería).
                        </p>

                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <label
                            htmlFor="delivery-camera-input"
                            className="btn btn-primary"
                            style={{ padding: '0.7rem 1.1rem', fontSize: '0.88rem', cursor: 'pointer' }}
                          >
                            <Camera size={18} /> Tomar Foto de Entrega
                          </label>

                          <label
                            htmlFor="delivery-gallery-input"
                            className="btn"
                            style={{
                              padding: '0.7rem 1.1rem',
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              background: '#f1f5f9',
                              color: 'var(--primary-burgundy)',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700
                            }}
                          >
                            <ImageIcon size={18} /> Abrir Galería
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón de Confirmación de Despacho */}
                  {(() => {
                    const isAlreadyDelivered = dispatchPackage.estado === 'ENTREGADO';
                    const hasDeliveryPhoto = !!(deliveryFile || deliveryFilePreview || dispatchPackage.imagenEntregaUrl);

                    return (
                      <button
                        type="submit"
                        disabled={dispatchLoading || isAlreadyDelivered}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.6rem',
                          padding: '1rem 1.25rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: (isAlreadyDelivered || dispatchLoading) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.25s ease',
                          border: hasDeliveryPhoto ? 'none' : '2px dashed #94a3b8',
                          boxShadow: isAlreadyDelivered
                            ? 'none'
                            : (hasDeliveryPhoto ? '0 4px 14px rgba(21, 128, 61, 0.35)' : 'none'),
                          background: isAlreadyDelivered
                            ? '#166534'
                            : (hasDeliveryPhoto ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)' : '#f1f5f9'),
                          color: isAlreadyDelivered
                            ? '#ffffff'
                            : (hasDeliveryPhoto ? '#ffffff' : '#334155'),
                          opacity: 1
                        }}
                      >
                        {isAlreadyDelivered ? (
                          <>
                            <CheckCircle2 size={20} color="#ffffff" />
                            <span>✅ Paquete Registrado como ENTREGADO</span>
                          </>
                        ) : dispatchLoading ? (
                          <>
                            <RefreshCw size={20} className="animate-spin" color="#ffffff" />
                            <span>Guardando Despacho...</span>
                          </>
                        ) : hasDeliveryPhoto ? (
                          <>
                            <CheckCircle2 size={20} color="#ffffff" />
                            <span>Marcar como ENTREGADO</span>
                          </>
                        ) : (
                          <>
                            <Camera size={20} color="var(--primary-burgundy)" />
                            <span>Adjunte Foto de Entrega para Marcar como ENTREGADO</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  {/* NOTIFICACIÓN DIRECTA DEBAJO DEL BOTÓN PARA DESPACHO */}
                  {dispatchNotification && dispatchNotification.text && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      background: dispatchNotification.type === 'error' ? '#fef2f2' : '#f0fdf4',
                      color: dispatchNotification.type === 'error' ? '#991b1b' : '#15803d',
                      border: dispatchNotification.type === 'error' ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
                      lineHeight: 1.45
                    }}>
                      {dispatchNotification.type === 'error' ? <AlertCircle size={22} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={22} style={{ flexShrink: 0 }} />}
                      <div>{dispatchNotification.text}</div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TABLA DE HISTORIAL DE PAQUETES DESPACHADOS / ENTREGADOS */}
          {(() => {
            const deliveredPackages = packages.filter(p => p.estado === 'ENTREGADO');
            return (
              <div style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                marginTop: '2rem',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Truck size={22} color="#15803d" />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', margin: 0 }}>
                      Historial de Paquetes Despachados / Entregados ({deliveredPackages.length})
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Registro histórico de paquetes entregados con comprobante
                  </span>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0', color: '#166534', fontWeight: 800 }}>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Código</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Fecha Entrega</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Cliente (Destinatario)</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Destino / Ruta</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Vendedor / Emisor</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Valor ($)</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Envío ($)</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Total ($)</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Contacto</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Tipo Pago</th>
                        <th style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>Estado</th>
                        <th style={{ padding: '1rem 1.15rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveredPackages.length === 0 ? (
                        <tr>
                          <td colSpan="12" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay paquetes despachados/entregados registrados hasta el momento.
                          </td>
                        </tr>
                      ) : (
                        deliveredPackages.map((pkg) => (
                          <tr key={pkg.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s ease' }}>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <span style={{
                                background: '#f0fdf4',
                                color: '#15803d',
                                padding: '0.3rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 900,
                                fontSize: '0.82rem',
                                border: '1.5px solid #86efac',
                                letterSpacing: '0.5px',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                {pkg.codigo || 'P-???'}
                              </span>
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {pkg.fechaEntrega || new Date(pkg.createdAt).toLocaleDateString('es-SV')}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                              {pkg.cliente}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', fontWeight: 600 }}>
                              {pkg.destino}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', fontWeight: 700 }}>
                              {pkg.vendedorNombre}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                              ${parseFloat(pkg.valor || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                              ${parseFloat(pkg.envio || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap' }}>
                              ${parseFloat(pkg.total || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {pkg.telefono}
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '0.3rem 0.7rem',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                whiteSpace: 'nowrap',
                                background: pkg.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7',
                                color: pkg.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534'
                              }}>
                                {pkg.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                              </span>
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '0.3rem 0.7rem',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                background: '#dcfce7',
                                color: '#15803d'
                              }}>
                                ENTREGADO
                              </span>
                            </td>
                            <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setViewingPackage(pkg)}
                                  title="Ver detalles y comprobantes"
                                  style={{
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: 'none',
                                    padding: '0.45rem 0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <Eye size={14} /> Ver
                                </button>
                                <button
                                  onClick={() => handleOpenEditPackage(pkg)}
                                  title="Editar datos del paquete"
                                  style={{
                                    background: '#fef3c7',
                                    color: '#d97706',
                                    border: 'none',
                                    padding: '0.45rem 0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <Edit3 size={14} /> Editar
                                </button>
                                <button
                                  onClick={() => handleDeletePackage(pkg.id)}
                                  title="Eliminar paquete"
                                  style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    padding: '0.45rem 0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        </div>
      )}

      {/* SECCIÓN NUEVA: LIQUIDACIÓN Y PLANILLAS */}
      {activeSubTab === 'settlement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header & Filter Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-burgundy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <DollarSign size={26} color="var(--primary-burgundy)" /> Liquidación y Planillas de Pagos
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                  Consolidado diario de cobros por Efectivo y Transferencia para clientes vendedores
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    loadPackages();
                    loadPlanillas();
                  }}
                  className="btn"
                  style={{ background: '#f1f5f9', color: 'var(--primary-burgundy)', border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <RefreshCw size={16} /> Actualizar Datos
                </button>
              </div>
            </div>

            {/* Filtros de Búsqueda y Selección */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.35rem' }}>
                  Filtrar por Fecha (Recepción / Entrega)
                </label>
                <input
                  type="date"
                  value={settlementDateFilter}
                  onChange={(e) => setSettlementDateFilter(e.target.value)}
                  className="input-control"
                  style={{ background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.35rem' }}>
                  Tipo de Pago
                </label>
                <select
                  value={settlementTypeFilter}
                  onChange={(e) => setSettlementTypeFilter(e.target.value)}
                  className="select-control"
                  style={{ background: '#ffffff' }}
                >
                  <option value="TODOS">Todos los Tipos de Pago</option>
                  <option value="TRANSFERENCIA">🏦 Solo Transferencias</option>
                  <option value="EFECTIVO">💵 Solo Efectivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.35rem' }}>
                  Estado de Liquidación
                </label>
                <select
                  value={settlementStatusFilter}
                  onChange={(e) => setSettlementStatusFilter(e.target.value)}
                  className="select-control"
                  style={{ background: '#ffffff' }}
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="PENDIENTE">⏳ Pendientes de Liquidar</option>
                  <option value="ABONADO">🏦 Abonados (Transferencias)</option>
                  <option value="PROCESADA">✅ Procesadas / Pagadas</option>
                </select>
              </div>

              {settlementDateFilter && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setSettlementDateFilter('')}
                    className="btn"
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: 700, width: '100%' }}
                  >
                    <X size={16} /> Limpiar Fecha
                  </button>
                </div>
              )}
            </div>

            {/* Tarjetas Resumen */}
            {(() => {
              const filteredList = packages.filter(p => {
                if (settlementDateFilter) {
                  const pDate = p.fechaRecepcion || p.fechaEntrega || '';
                  if (!pDate.includes(settlementDateFilter)) return false;
                }
                if (settlementTypeFilter !== 'TODOS' && p.tipoPago !== settlementTypeFilter) return false;
                if (settlementStatusFilter !== 'TODOS' && (p.estadoLiquidacion || 'PENDIENTE') !== settlementStatusFilter) return false;
                return true;
              });

              const totalTransferencias = filteredList
                .filter(p => p.tipoPago === 'TRANSFERENCIA')
                .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

              const totalEfectivo = filteredList
                .filter(p => p.tipoPago === 'EFECTIVO')
                .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

              const totalGeneral = totalTransferencias + totalEfectivo;

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginTop: '1.5rem'
                }}>
                  <div style={{ background: 'linear-gradient(135deg, #4C0070 0%, #6B0038 100%)', color: '#fff', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase' }}>Total Paquetes Filtrados</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem' }}>{filteredList.length}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>En listado actual</div>
                  </div>

                  <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #c7d2fe' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>🏦 Total Transferencias</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem' }}>${totalTransferencias.toFixed(2)}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Para abonar en banco</div>
                  </div>

                  <div style={{ background: '#dcfce7', color: '#166534', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>💵 Total Efectivo</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem' }}>${totalEfectivo.toFixed(2)}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Cobro uno a uno en oficina</div>
                  </div>

                  <div style={{ background: '#fef3c7', color: '#92400e', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>💰 Total General Liquidación</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem' }}>${totalGeneral.toFixed(2)}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Consolidado del día</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* TABLA DE PREVENTA Y BOTONES DE ACCIÓN PARA GENERAR PLANILLA / EXPORTAR EXCEL */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            {(() => {
              const filteredList = packages.filter(p => {
                if (settlementDateFilter) {
                  const pDate = p.fechaRecepcion || p.fechaEntrega || '';
                  if (!pDate.includes(settlementDateFilter)) return false;
                }
                if (settlementTypeFilter !== 'TODOS' && p.tipoPago !== settlementTypeFilter) return false;
                if (settlementStatusFilter !== 'TODOS' && (p.estadoLiquidacion || 'PENDIENTE') !== settlementStatusFilter) return false;
                return true;
              });

              const exportToExcel = (rowsToExport, customFilename) => {
                if (!rowsToExport || rowsToExport.length === 0) {
                  alert('No hay registros para exportar a Excel.');
                  return;
                }
                const formatted = rowsToExport.map(p => ({
                  'Código Paquete': p.codigo || '',
                  'Fecha Recepción': p.fechaRecepcion || '',
                  'Fecha Entrega': p.fechaEntrega || '',
                  'Cliente (Destinatario)': p.cliente || '',
                  'Destino / Ruta': p.destino || '',
                  'Vendedor / Emisor': p.vendedorNombre || '',
                  'Valor ($)': p.valor ? parseFloat(p.valor).toFixed(2) : '0.00',
                  'Envío ($)': p.envio ? parseFloat(p.envio).toFixed(2) : '0.00',
                  'Total ($)': p.total ? parseFloat(p.total).toFixed(2) : '0.00',
                  'Teléfono': p.telefono || '',
                  'Tipo Pago': p.tipoPago || 'EFECTIVO',
                  'Estado Paquete': p.estado || '',
                  'Estado Liquidación': p.estadoLiquidacion || 'PENDIENTE'
                }));
                const dateTag = new Date().toISOString().slice(0, 10);
                const fname = customFilename || `Liquidacion_Amairany_${settlementTypeFilter}_${dateTag}.csv`;
                downloadExcelCSV(fname, formatted);
              };

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileSpreadsheet size={20} color="var(--primary-burgundy)" /> Detalle de Paquetes Filtrados ({filteredList.length})
                    </h4>

                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => exportToExcel(filteredList)}
                        className="btn"
                        style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, padding: '0.6rem 1rem' }}
                      >
                        <FileSpreadsheet size={16} /> Exportar a Excel (CSV)
                      </button>

                      <button
                        onClick={() => handleGeneratePlanilla('TRANSFERENCIA', filteredList)}
                        disabled={generatingPlanilla || filteredList.filter(p => p.tipoPago === 'TRANSFERENCIA').length === 0}
                        className="btn btn-primary"
                        style={{ padding: '0.6rem 1rem' }}
                      >
                        <Plus size={16} /> Generar Planilla (Transferencias)
                      </button>

                      <button
                        onClick={() => handleGeneratePlanilla('EFECTIVO', filteredList)}
                        disabled={generatingPlanilla || filteredList.filter(p => p.tipoPago === 'EFECTIVO').length === 0}
                        className="btn"
                        style={{ background: '#166534', color: '#ffffff', fontWeight: 800, padding: '0.6rem 1rem' }}
                      >
                        <Plus size={16} /> Generar Planilla (Efectivo)
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: 'var(--primary-burgundy)', fontWeight: 800 }}>
                          <th style={{ padding: '0.9rem 1rem' }}>Código</th>
                          <th style={{ padding: '0.9rem 1rem' }}>F. Recepción</th>
                          <th style={{ padding: '0.9rem 1rem' }}>F. Entrega</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Cliente</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Destino</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Vendedor</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Total ($)</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Tipo Pago</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Estado Pqte</th>
                          <th style={{ padding: '0.9rem 1rem' }}>Estado Liquidación</th>
                          <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredList.length === 0 ? (
                          <tr>
                            <td colSpan="11" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No hay paquetes registrados que coincidan con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          filteredList.map((pkg) => (
                            <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                                {pkg.codigo}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                                {pkg.fechaRecepcion || '-'}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                                {pkg.fechaEntrega || '-'}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{pkg.cliente}</td>
                              <td style={{ padding: '0.85rem 1rem' }}>{pkg.destino}</td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{pkg.vendedorNombre}</td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                                ${parseFloat(pkg.total).toFixed(2)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: pkg.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7',
                                  color: pkg.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534'
                                }}>
                                  {pkg.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: pkg.estado === 'ENTREGADO' ? '#dcfce7' : '#e0f2fe',
                                  color: pkg.estado === 'ENTREGADO' ? '#15803d' : '#0369a1'
                                }}>
                                  {pkg.estado}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: (pkg.estadoLiquidacion === 'PROCESADA' || pkg.estadoLiquidacion === 'ABONADO') ? '#dcfce7' : '#fef3c7',
                                  color: (pkg.estadoLiquidacion === 'PROCESADA' || pkg.estadoLiquidacion === 'ABONADO') ? '#15803d' : '#d97706'
                                }}>
                                  {pkg.estadoLiquidacion || 'PENDIENTE'}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                {pkg.tipoPago === 'EFECTIVO' ? (
                                  <button
                                    onClick={() => handleLiquidarIndividual(pkg.id)}
                                    disabled={pkg.estadoLiquidacion === 'PROCESADA'}
                                    style={{
                                      background: pkg.estadoLiquidacion === 'PROCESADA' ? '#e2e8f0' : '#166534',
                                      color: pkg.estadoLiquidacion === 'PROCESADA' ? '#94a3b8' : '#ffffff',
                                      border: 'none',
                                      padding: '0.4rem 0.75rem',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: pkg.estadoLiquidacion === 'PROCESADA' ? 'default' : 'pointer',
                                      fontWeight: 800,
                                      fontSize: '0.78rem'
                                    }}
                                  >
                                    {pkg.estadoLiquidacion === 'PROCESADA' ? '✅ Liquidado (Cobrado)' : '💵 Liquidar 1 a 1'}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                    Vía Planilla Masiva
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>

          {/* HISTORIAL DE PLANILLAS GENERADAS EN BASE DE DATOS */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} color="var(--primary-burgundy)" /> Registros de Planillas de Liquidación ({planillas.length})
            </h4>

            {planillasLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Cargando historial de planillas...
              </div>
            ) : planillas.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Aún no se han generado planillas de liquidación.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {planillas.map((pln) => {
                  let detail = [];
                  try {
                    detail = typeof pln.detalleJson === 'string' ? JSON.parse(pln.detalleJson) : (pln.detalleJson || []);
                  } catch (e) {}

                  return (
                    <div key={pln.id} style={{
                      background: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #e2e8f0',
                      padding: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              background: '#FAF5FF',
                              color: 'var(--primary-burgundy)',
                              padding: '0.3rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 900,
                              fontSize: '0.9rem',
                              border: '1.5px solid rgba(76,0,112,0.25)'
                            }}>
                              {pln.codigo}
                            </span>
                            <span style={{
                              padding: '0.3rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: pln.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7',
                              color: pln.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534'
                            }}>
                              {pln.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                            </span>
                            <span style={{
                              padding: '0.3rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: pln.estado === 'PROCESADA' ? '#dcfce7' : pln.estado === 'ABONADO' ? '#e0f2fe' : '#fef3c7',
                              color: pln.estado === 'PROCESADA' ? '#15803d' : pln.estado === 'ABONADO' ? '#0369a1' : '#d97706'
                            }}>
                              ESTADO: {pln.estado}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
                            Fecha de Planilla: <strong>{pln.fecha}</strong> | Cantidad Paquetes: <strong>{detail.length}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                            Total: ${parseFloat(pln.montoTotal).toFixed(2)}
                          </div>

                          {/* ACCIONES DE ESTADO PARA PLANILLAS */}
                          {pln.tipoPago === 'TRANSFERENCIA' && pln.estado !== 'PROCESADA' && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {pln.estado === 'GENERADA' && (
                                <button
                                  onClick={() => handleUpdatePlanillaStatus(pln.id, 'ABONADO')}
                                  className="btn"
                                  style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                                >
                                  Marcar ABONADO
                                </button>
                              )}
                              <button
                                onClick={() => handleUpdatePlanillaStatus(pln.id, 'PROCESADA')}
                                className="btn"
                                style={{ background: '#15803d', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                              >
                                Marcar PROCESADA (Masivo)
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              const exportRows = detail.map(p => ({
                                'Código Planilla': pln.codigo,
                                'Código Paquete': p.codigo || '',
                                'Cliente': p.cliente || '',
                                'Destino': p.destino || '',
                                'Vendedor': p.vendedorNombre || '',
                                'Valor ($)': p.valor ? parseFloat(p.valor).toFixed(2) : '0.00',
                                'Envío ($)': p.envio ? parseFloat(p.envio).toFixed(2) : '0.00',
                                'Total ($)': p.total ? parseFloat(p.total).toFixed(2) : '0.00',
                                'Tipo Pago': pln.tipoPago,
                                'Estado Planilla': pln.estado
                              }));
                              downloadExcelCSV(`Planilla_${pln.codigo}.csv`, exportRows);
                            }}
                            className="btn"
                            style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                          >
                            <FileSpreadsheet size={15} /> Descargar Excel
                          </button>
                        </div>
                      </div>

                      {/* Lógica Uno a Uno para Efectivo dentro de la Planilla */}
                      {pln.tipoPago === 'EFECTIVO' && detail.length > 0 && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                            Paquetes en Efectivo de la Planilla (Procesamiento Uno a Uno cuando el Vendedor recoge el dinero):
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#ffffff', color: '#475569', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: '0.4rem 0.6rem' }}>Código</th>
                                  <th style={{ padding: '0.4rem 0.6rem' }}>Vendedor</th>
                                  <th style={{ padding: '0.4rem 0.6rem' }}>Cliente</th>
                                  <th style={{ padding: '0.4rem 0.6rem' }}>Monto ($)</th>
                                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Acción Uno a Uno</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.map(dp => {
                                  const dbPkg = packages.find(p => p.id === dp.id || p.codigo === dp.codigo);
                                  const currentStatus = dbPkg ? (dbPkg.estadoLiquidacion || 'PENDIENTE') : 'PENDIENTE';
                                  return (
                                    <tr key={dp.id || dp.codigo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 800 }}>{dp.codigo}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{dp.vendedorNombre}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{dp.cliente}</td>
                                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 900 }}>${parseFloat(dp.total || 0).toFixed(2)}</td>
                                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                                        <button
                                          onClick={() => dp.id && handleLiquidarIndividual(dp.id)}
                                          disabled={currentStatus === 'PROCESADA'}
                                          style={{
                                            background: currentStatus === 'PROCESADA' ? '#e2e8f0' : '#166534',
                                            color: currentStatus === 'PROCESADA' ? '#94a3b8' : '#ffffff',
                                            border: 'none',
                                            padding: '0.25rem 0.55rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            cursor: currentStatus === 'PROCESADA' ? 'default' : 'pointer'
                                          }}
                                        >
                                          {currentStatus === 'PROCESADA' ? '✅ Cobrado por Vendedor' : '💵 Entregar Dinero a Vendedor'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SECCIÓN NUEVA: DASHBOARD GENERAL Y METRICAS */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Dashboard */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary-burgundy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <BarChart3 size={28} color="var(--primary-burgundy)" /> Dashboard General y Consolidado
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                  Resumen de recepción, entregas, cobros en efectivo y transferencias bancarias
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const exportRows = packages.map(p => ({
                      'Código': p.codigo || '',
                      'Fecha Recepción': p.fechaRecepcion || '',
                      'Fecha Entrega': p.fechaEntrega || '',
                      'Fecha Pagado (Efectivo)': p.fechaPagado || '',
                      'Fecha Abonado (Transferencia)': p.fechaAbonado || '',
                      'Cliente': p.cliente || '',
                      'Destino': p.destino || '',
                      'Vendedor': p.vendedorNombre || '',
                      'Valor ($)': p.valor ? parseFloat(p.valor).toFixed(2) : '0.00',
                      'Envío ($)': p.envio ? parseFloat(p.envio).toFixed(2) : '0.00',
                      'Total ($)': p.total ? parseFloat(p.total).toFixed(2) : '0.00',
                      'Tipo Pago': p.tipoPago || 'EFECTIVO',
                      'Estado Paquete': p.estado || '',
                      'Estado Liquidación': p.estadoLiquidacion || 'PENDIENTE'
                    }));
                    downloadExcelCSV(`Consolidado_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
                  }}
                  className="btn"
                  style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, padding: '0.65rem 1rem' }}
                >
                  <FileSpreadsheet size={17} /> Exportar Reporte Consolidado
                </button>

                <button
                  onClick={() => {
                    loadPackages();
                    loadPlanillas();
                  }}
                  className="btn"
                  style={{ background: '#f1f5f9', color: 'var(--primary-burgundy)', border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <RefreshCw size={16} /> Actualizar
                </button>
              </div>
            </div>

            {/* CALCULOS DE METRICAS DEL DASHBOARD */}
            {(() => {
              const totalRecibidosCount = packages.length;
              const totalRecibidosMonto = packages.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

              const entregadosList = packages.filter(p => p.estado === 'ENTREGADO');
              const totalEntregadosCount = entregadosList.length;
              const totalEntregadosMonto = entregadosList.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

              const efectivoList = packages.filter(p => p.tipoPago === 'EFECTIVO');
              const totalEfectivoCount = efectivoList.length;
              const totalEfectivoMonto = efectivoList.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
              const efectivoPagadosCount = efectivoList.filter(p => p.estadoLiquidacion === 'PROCESADA').length;

              const transferenciaList = packages.filter(p => p.tipoPago === 'TRANSFERENCIA');
              const totalTransferenciaCount = transferenciaList.length;
              const totalTransferenciaMonto = transferenciaList.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
              const transferenciaAbonadosCount = transferenciaList.filter(p => p.estadoLiquidacion === 'ABONADO' || p.estadoLiquidacion === 'PROCESADA').length;

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {/* METRICA 1: RECIBIDOS */}
                  <div style={{
                    background: 'linear-gradient(135deg, #4C0070 0%, #6B0038 100%)',
                    color: '#ffffff',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 20px rgba(76,0,112,0.18)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9, letterSpacing: '0.5px' }}>
                        Paquetes Recibidos
                      </span>
                      <Box size={24} style={{ opacity: 0.8 }} />
                    </div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '0.4rem' }}>
                      {totalRecibidosCount} <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.8 }}>paquetes</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#fef08a' }}>
                      Total: ${totalRecibidosMonto.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.4rem' }}>
                      Ingresados globalmente en casillero
                    </div>
                  </div>

                  {/* METRICA 2: ENTREGADOS */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    color: '#15803d',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Paquetes Entregados
                      </span>
                      <Truck size={24} color="#15803d" />
                    </div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '0.4rem', color: '#166534' }}>
                      {totalEntregadosCount} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#15803d' }}>paquetes</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.2rem', color: '#15803d' }}>
                      Total: ${totalEntregadosMonto.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '0.5rem', borderTop: '1px solid #bbf7d0', paddingTop: '0.4rem', fontWeight: 600 }}>
                      Despachados con comprobante de entrega
                    </div>
                  </div>

                  {/* METRICA 3: EFECTIVO */}
                  <div style={{
                    background: '#fefce8',
                    border: '1.5px solid #fef08a',
                    color: '#854d0e',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Paquetes en Efectivo
                      </span>
                      <DollarSign size={24} color="#854d0e" />
                    </div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '0.4rem', color: '#713f12' }}>
                      {totalEfectivoCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>paquetes</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.2rem', color: '#854d0e' }}>
                      Total: ${totalEfectivoMonto.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#854d0e', marginTop: '0.5rem', borderTop: '1px solid #fef08a', paddingTop: '0.4rem', fontWeight: 700 }}>
                      Cobrados a vendedor: {efectivoPagadosCount} de {totalEfectivoCount}
                    </div>
                  </div>

                  {/* METRICA 4: TRANSFERENCIA */}
                  <div style={{
                    background: '#e0e7ff',
                    border: '1.5px solid #c7d2fe',
                    color: '#3730a3',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Paquetes en Transferencia
                      </span>
                      <CreditCard size={24} color="#3730a3" />
                    </div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '0.4rem', color: '#312e81' }}>
                      {totalTransferenciaCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>paquetes</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.2rem', color: '#3730a3' }}>
                      Total: ${totalTransferenciaMonto.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#3730a3', marginTop: '0.5rem', borderTop: '1px solid #c7d2fe', paddingTop: '0.4rem', fontWeight: 700 }}>
                      Abonados/Procesados: {transferenciaAbonadosCount} de {totalTransferenciaCount}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>

          {/* TABLAS DETALLADAS POR CATEGORÍA EN EL DASHBOARD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.75rem' }}>
            
            {/* TABLA 1: DETALLE PAQUETES RECIBIDOS */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box size={20} color="var(--primary-burgundy)" /> Detalle y Total de Paquetes Recibidos ({packages.length})
              </h4>
              <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: 'var(--primary-burgundy)', fontWeight: 800, borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>F. Recepción</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Cliente</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Vendedor</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Total ($)</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Tipo Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Sin paquetes recibidos.</td></tr>
                    ) : (
                      packages.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>{p.codigo}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#64748b' }}>{p.fechaRecepcion || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{p.cliente}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{p.vendedorNombre}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 900 }}>${parseFloat(p.total || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '10px', fontWeight: 800, background: p.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7', color: p.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534' }}>
                              {p.tipoPago}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA 2: DETALLE PAQUETES ENTREGADOS */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
              {(() => {
                const list = packages.filter(p => p.estado === 'ENTREGADO');
                return (
                  <>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck size={20} color="#15803d" /> Detalle y Total de Paquetes Entregados ({list.length})
                    </h4>
                    <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f0fdf4', color: '#166534', fontWeight: 800, borderBottom: '2px solid #bbf7d0' }}>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>F. Entrega</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Cliente</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Vendedor</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Total ($)</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Foto Comprobante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Aún no hay paquetes entregados.</td></tr>
                          ) : (
                            list.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#15803d' }}>{p.codigo}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#15803d' }}>{p.fechaEntrega || '-'}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{p.cliente}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>{p.vendedorNombre}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 900, color: '#15803d' }}>${parseFloat(p.total || 0).toFixed(2)}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  {p.imagenEntregaUrl ? (
                                    <span style={{ color: '#166534', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <CheckCircle2 size={14} /> Adjuntada
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* TABLA 3: DETALLE PAQUETES EN EFECTIVO */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
              {(() => {
                const list = packages.filter(p => p.tipoPago === 'EFECTIVO');
                return (
                  <>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#854d0e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={20} color="#854d0e" /> Detalle y Total de Paquetes en Efectivo ({list.length})
                    </h4>
                    <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#fefce8', color: '#854d0e', fontWeight: 800, borderBottom: '2px solid #fef08a' }}>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Fecha Pagado</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Cliente</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Vendedor</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Total ($)</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Estado Liquidación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Sin paquetes en efectivo.</td></tr>
                          ) : (
                            list.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#854d0e' }}>{p.codigo}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: p.fechaPagado ? '#15803d' : '#94a3b8' }}>
                                  {p.fechaPagado || 'Pendiente'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{p.cliente}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>{p.vendedorNombre}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 900, color: '#854d0e' }}>${parseFloat(p.total || 0).toFixed(2)}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    background: p.estadoLiquidacion === 'PROCESADA' ? '#dcfce7' : '#fef3c7',
                                    color: p.estadoLiquidacion === 'PROCESADA' ? '#15803d' : '#d97706'
                                  }}>
                                    {p.estadoLiquidacion === 'PROCESADA' ? 'COBRADO' : (p.estadoLiquidacion || 'PENDIENTE')}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* TABLA 4: DETALLE PAQUETES EN TRANSFERENCIA */}
            <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
              {(() => {
                const list = packages.filter(p => p.tipoPago === 'TRANSFERENCIA');
                return (
                  <>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3730a3', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CreditCard size={20} color="#3730a3" /> Detalle y Total de Paquetes en Transferencia ({list.length})
                    </h4>
                    <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 800, borderBottom: '2px solid #c7d2fe' }}>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Fecha Abonado</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Cliente</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Vendedor</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Total ($)</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Estado Liquidación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Sin paquetes en transferencia.</td></tr>
                          ) : (
                            list.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#3730a3' }}>{p.codigo}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: p.fechaAbonado ? '#0369a1' : '#94a3b8' }}>
                                  {p.fechaAbonado || 'Pendiente'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{p.cliente}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>{p.vendedorNombre}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 900, color: '#3730a3' }}>${parseFloat(p.total || 0).toFixed(2)}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    background: (p.estadoLiquidacion === 'PROCESADA' || p.estadoLiquidacion === 'ABONADO') ? '#dcfce7' : '#fef3c7',
                                    color: (p.estadoLiquidacion === 'PROCESADA' || p.estadoLiquidacion === 'ABONADO') ? '#15803d' : '#d97706'
                                  }}>
                                    {p.estadoLiquidacion || 'PENDIENTE'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN DE LOGO Y MARCA */}
      {activeSubTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Logo Manager Panel */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ImageIcon size={24} /> Logo Oficial de la Empresa
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              El logo se almacena de forma persistente en la base de datos y se utiliza dinámicamente en el encabezado (Navbar), pie de página y componentes del sistema.
            </p>

            {/* Current Logo Preview */}
            <div style={{
              background: '#ffffff',
              border: '2px dashed var(--primary-burgundy)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                Logo Actual (En Base de Datos)
              </div>
              <img
                src={logoPreview || siteConfig?.logoUrl || '/uploads/logo.svg'}
                alt="Logo Empresa"
                style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo.svg';
                }}
              />
            </div>

            {/* File Upload Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                Seleccionar Nuevo Logo (Imagen o SVG)
              </label>
              <input
                type="file"
                accept="image/*,.svg"
                onChange={handleLogoSelect}
                className="input-control"
                style={{ fontSize: '0.9rem' }}
              />
            </div>

            <button
              onClick={handleSaveLogo}
              disabled={!logoPreview || logoLoading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            >
              {logoLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Guardando en Base de Datos...
                </>
              ) : (
                <>
                  <Save size={18} /> Subir y Actualizar Logo en Base de Datos
                </>
              )}
            </button>
          </div>

          {/* Official Colors Palette Panel */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Palette size={24} color="var(--accent-crimson)" /> Paleta de Colores Oficiales
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Configuración de la identidad cromática institucional aplicada en todo el sitio web de Amairany Express.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Morado */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#4C0070', boxShadow: '0 4px 10px rgba(76, 0, 112, 0.3)' }} />
                  <div>
                    <div style={{ fontWeight: 900, color: 'var(--primary-burgundy)', fontSize: '1rem' }}>Morado Institucional</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Color principal de cabeceras y títulos</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  #4C0070
                </div>
              </div>

              {/* Rosado */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ED0047', boxShadow: '0 4px 10px rgba(237, 0, 71, 0.3)' }} />
                  <div>
                    <div style={{ fontWeight: 900, color: '#ED0047', fontSize: '1rem' }}>Rosado de Acento</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Botones principales, chevrons y resaltados</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  #ED0047
                </div>
              </div>

              {/* Gris */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F3F3F3', border: '1px solid #cbd5e1' }} />
                  <div>
                    <div style={{ fontWeight: 900, color: '#334155', fontSize: '1rem' }}>Gris de Fondo</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Fondo general de la aplicación y tarjetas</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  #F3F3F3
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE RUTA COMPLETO */}
      {editingRoute && editFormData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div
            className="animate-fade-in"
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative'
            }}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => {
                setEditingRoute(null);
                setEditFormData(null);
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="badge badge-crimson" style={{ marginBottom: '0.4rem' }}>
                <Edit3 size={14} /> Modificar Punto de Entrega
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                Editar Ruta: {editingRoute.lugarPrincipal}
              </h2>
            </div>

            <form onSubmit={handleSaveEditedRoute} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Imagen y Cambio de Imagen */}
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <img
                  src={getRouteImageSrc(editFilePreview || editFormData.imagenUrl, editFormData.lugarPrincipal)}
                  alt="Vista previa"
                  style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}
                />
                <div style={{ flexGrow: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.4rem' }}>
                    Reemplazar Imagen de la Ruta
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="input-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Al seleccionar una imagen nueva, se actualizará el banner automáticamente.
                  </div>
                </div>
              </div>

              {/* Lugar Principal en Negrita */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Lugar Principal (Letras más negritas) *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.lugarPrincipal}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, lugarPrincipal: e.target.value }))}
                  className="input-control"
                  style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-burgundy)' }}
                />
              </div>

              {/* Días y Horarios */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Días de Atención *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.dias}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, dias: e.target.value }))}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Horario de Atención *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.horario}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, horario: e.target.value }))}
                    className="input-control"
                  />
                </div>
              </div>

              {/* Lugar de Referencia */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  Lugar de Referencia / Dirección Exacta *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editFormData.lugarReferencia}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, lugarReferencia: e.target.value }))}
                  className="input-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Organización Territorial El Salvador */}
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={18} /> Organización Territorial El Salvador
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Departamento:</label>
                    <select
                      value={editFormData.departamentoNombre}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const deptObj = elSalvadorData.find(d => d.departamento === newDept);
                        const firstMun = deptObj?.municipios[0]?.nombre || '';
                        const firstDist = deptObj?.municipios[0]?.distritos[0] || '';
                        setEditFormData(prev => ({
                          ...prev,
                          departamentoNombre: newDept,
                          municipioNombre: firstMun,
                          distritoNombre: firstDist
                        }));
                      }}
                      className="select-control"
                    >
                      {elSalvadorData.map(d => (
                        <option key={d.departamento} value={d.departamento}>{d.departamento}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Municipio:</label>
                    <select
                      value={editFormData.municipioNombre}
                      onChange={(e) => {
                        const newMun = e.target.value;
                        const munObj = editMunicipiosList.find(m => m.nombre === newMun);
                        const firstDist = munObj?.distritos[0] || '';
                        setEditFormData(prev => ({
                          ...prev,
                          municipioNombre: newMun,
                          distritoNombre: firstDist
                        }));
                      }}
                      className="select-control"
                    >
                      {editMunicipiosList.map(m => (
                        <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Distrito:</label>
                    <select
                      value={editFormData.distritoNombre}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, distritoNombre: e.target.value }))}
                      className="select-control"
                    >
                      {editDistritosList.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Acciones de Edición */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                >
                  <Save size={18} />
                  {saveLoading ? 'Guardando Cambios...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoute(null);
                    setEditFormData(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE CLIENTE VENDEDOR */}
      {editingSeller && editSellerFormData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div
            className="animate-fade-in"
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => {
                setEditingSeller(null);
                setEditSellerFormData(null);
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="badge badge-crimson" style={{ marginBottom: '0.4rem' }}>
                <Edit3 size={14} /> Mantenimiento de Cliente Vendedor
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                Editar: {editingSeller.nombre}
              </h2>
            </div>

            <form onSubmit={handleSaveEditedSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Nombre Completo*
                </label>
                <input
                  type="text"
                  required
                  value={editSellerFormData.nombre}
                  onChange={(e) => setEditSellerFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    DUI *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="00000000-0"
                    value={editSellerFormData.dui}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                      const formatted = raw.length > 8 ? `${raw.slice(0, 8)}-${raw.slice(8)}` : raw;
                      setEditSellerFormData(prev => ({ ...prev, dui: formatted }));
                    }}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Nombre de Tienda / Negocio *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSellerFormData.tienda}
                    onChange={(e) => setEditSellerFormData(prev => ({ ...prev, tienda: e.target.value }))}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={editSellerFormData.correo}
                    onChange={(e) => setEditSellerFormData(prev => ({ ...prev, correo: e.target.value }))}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    WhatsApp / Teléfono*
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="7788-9900"
                    value={editSellerFormData.whatsapp}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
                      setEditSellerFormData(prev => ({ ...prev, whatsapp: formatted }));
                    }}
                    className="input-control"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  Cuenta Banco Agrícola (Numérica) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 3450987654"
                  value={editSellerFormData.cuentaBancoAgricola}
                  onChange={(e) => {
                    const numOnly = e.target.value.replace(/\D/g, '');
                    setEditSellerFormData(prev => ({ ...prev, cuentaBancoAgricola: numOnly }));
                  }}
                  className="input-control"
                />
              </div>

              {/* CAMPO ESTADO: VISIBLE SÓLO AL EDITAR */}
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--primary-burgundy)'
              }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 900, color: 'var(--primary-burgundy)', marginBottom: '0.4rem' }}>
                  Estado del Cliente (Mantenimiento de Estado) *
                </label>
                <select
                  value={editSellerFormData.estado}
                  onChange={(e) => setEditSellerFormData(prev => ({ ...prev, estado: e.target.value }))}
                  className="select-control"
                  style={{ fontWeight: 800 }}
                >
                  <option value="ACTIVO">ACTIVO (Habilitado)</option>
                  <option value="INACTIVO">INACTIVO (Deshabilitado)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Nota: Este campo de estado se gestiona únicamente durante la modificación/mantenimiento.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                >
                  <Save size={18} />
                  {saveLoading ? 'Guardando Cambios...' : 'Guardar Cambios del Vendedor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSeller(null);
                    setEditSellerFormData(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL VER DETALLE DE PAQUETE */}
      {viewingPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="animate-modal-pop" style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: '#FAF5FF',
                  color: 'var(--primary-burgundy)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  border: '1.5px solid rgba(76,0,112,0.25)',
                  letterSpacing: '0.5px'
                }}>
                  {viewingPackage.codigo || 'P-???'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-burgundy)', margin: 0 }}>
                    Detalles del Paquete Recepcionado
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Registrado el: {new Date(viewingPackage.createdAt || Date.now()).toLocaleString('es-SV')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setViewingPackage(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid 2 columnas: Imagen a la izquierda, Datos a la derecha */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* Contenedor de Fotografía(s): Recepción y/o Entrega */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center'
                }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.75rem' }}>
                    📦 Fotografía de Recepción (Guía)
                  </h4>
                  {viewingPackage.imagenUrl ? (
                    <img
                      src={getPackageImageSrc(viewingPackage.imagenUrl)}
                      alt="Guía o etiqueta de paquete"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const fallbackEl = document.getElementById(`fallback-viewing-img-${viewingPackage.id}`);
                        if (fallbackEl) fallbackEl.style.display = 'block';
                      }}
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-sm)',
                        background: '#ffffff'
                      }}
                    />
                  ) : null}

                  <div
                    id={`fallback-viewing-img-${viewingPackage.id}`}
                    style={{
                      display: (!viewingPackage.imagenUrl) ? 'block' : 'none',
                      padding: '2.5rem 1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <ImageIcon size={40} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    Fotografía de recepción no disponible o expirada en el servidor.
                  </div>
                </div>

                {viewingPackage.imagenEntregaUrl && (
                  <div style={{
                    background: '#f0fdf4',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    border: '1px dashed #86efac',
                    textAlign: 'center'
                  }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#15803d', marginBottom: '0.75rem' }}>
                      🚚 Comprobante de Entrega / Despacho
                    </h4>
                    <img
                      src={getPackageImageSrc(viewingPackage.imagenEntregaUrl)}
                      alt="Comprobante de entrega"
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-sm)',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Lista de Detalles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary-burgundy)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Cliente (Destinatario)
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                    {viewingPackage.cliente}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Destino / Ruta de Entrega
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {viewingPackage.destino}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Vendedor / Tienda / Emisor
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {viewingPackage.vendedorNombre}
                  </span>
                </div>

                {/* Montos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#faf5ff', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(76,0,112,0.15)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>Valor</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>${parseFloat(viewingPackage.valor).toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>Envío</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>${parseFloat(viewingPackage.envio).toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>Total</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>${parseFloat(viewingPackage.total).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contacto</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{viewingPackage.telefono}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha Entrega</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{viewingPackage.fechaEntrega}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Forma de Pago</span>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'inline-block',
                      background: viewingPackage.tipoPago === 'TRANSFERENCIA' ? '#e0e7ff' : '#dcfce7',
                      color: viewingPackage.tipoPago === 'TRANSFERENCIA' ? '#3730a3' : '#166534'
                    }}>
                      {viewingPackage.tipoPago === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 EFECTIVO'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Estado</span>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'inline-block',
                      background: viewingPackage.estado === 'RECEPCIONADO' ? '#e0f2fe' : '#dcfce7',
                      color: viewingPackage.estado === 'RECEPCIONADO' ? '#0369a1' : '#15803d'
                    }}>
                      {viewingPackage.estado}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {viewingPackage.tipoPago === 'TRANSFERENCIA' ? 'Fecha Abonado' : 'Fecha Pagado'}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: (viewingPackage.fechaPagado || viewingPackage.fechaAbonado) ? '#15803d' : '#94a3b8' }}>
                      {viewingPackage.tipoPago === 'TRANSFERENCIA' ? (viewingPackage.fechaAbonado || 'Pendiente') : (viewingPackage.fechaPagado || 'Pendiente')}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Estado Liquidación</span>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'inline-block',
                      background: (viewingPackage.estadoLiquidacion === 'PROCESADA' || viewingPackage.estadoLiquidacion === 'ABONADO') ? '#dcfce7' : '#fef3c7',
                      color: (viewingPackage.estadoLiquidacion === 'PROCESADA' || viewingPackage.estadoLiquidacion === 'ABONADO') ? '#15803d' : '#d97706'
                    }}>
                      {viewingPackage.estadoLiquidacion || 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', textAlign: 'right' }}>
              <button
                onClick={() => setViewingPackage(null)}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.5rem' }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PAQUETE */}
      {editingPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="animate-modal-pop" style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit3 size={22} color="var(--primary-burgundy)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-burgundy)', margin: 0 }}>
                  Editar Paquete {editingPackage.codigo ? `(${editingPackage.codigo})` : ''}
                </h3>
              </div>
              <button
                onClick={() => setEditingPackage(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPackage} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                  Cliente (Destinatario) *
                </label>
                <input
                  type="text"
                  required
                  value={editPackageFormData.cliente}
                  onChange={(e) => setEditPackageFormData(prev => ({ ...prev, cliente: e.target.value }))}
                  className="input-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Destino / Ruta *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPackageFormData.destino}
                    onChange={(e) => setEditPackageFormData(prev => ({ ...prev, destino: e.target.value }))}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Vendedor / Emisor *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPackageFormData.vendedorNombre}
                    onChange={(e) => setEditPackageFormData(prev => ({ ...prev, vendedorNombre: e.target.value }))}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Valor ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPackageFormData.valor}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditPackageFormData(prev => ({
                        ...prev,
                        valor: val,
                        total: +(val + (parseFloat(prev.envio) || 0)).toFixed(2)
                      }));
                    }}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Envío ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPackageFormData.envio}
                    onChange={(e) => {
                      const env = parseFloat(e.target.value) || 0;
                      setEditPackageFormData(prev => ({
                        ...prev,
                        envio: env,
                        total: +((parseFloat(prev.valor) || 0) + env).toFixed(2)
                      }));
                    }}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Total ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={editPackageFormData.total}
                    className="input-control"
                    style={{ background: '#f8fafc', fontWeight: 900, color: 'var(--primary-burgundy)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Teléfono / Contacto *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={editPackageFormData.telefono}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 4) val = `${val.slice(0, 4)}-${val.slice(4, 8)}`;
                      setEditPackageFormData(prev => ({ ...prev, telefono: val }));
                    }}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Fecha de Entrega *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPackageFormData.fechaEntrega}
                    onChange={(e) => setEditPackageFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Tipo de Pago *
                  </label>
                  <select
                    value={editPackageFormData.tipoPago}
                    onChange={(e) => setEditPackageFormData(prev => ({ ...prev, tipoPago: e.target.value }))}
                    className="select-control"
                  >
                    <option value="EFECTIVO">💵 EFECTIVO</option>
                    <option value="TRANSFERENCIA">🏦 TRANSFERENCIA</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.3rem' }}>
                    Estado del Paquete *
                  </label>
                  <select
                    value={editPackageFormData.estado}
                    onChange={(e) => setEditPackageFormData(prev => ({ ...prev, estado: e.target.value }))}
                    className="select-control"
                  >
                    <option value="RECEPCIONADO">RECEPCIONADO</option>
                    <option value="EN RUTA">EN RUTA</option>
                    <option value="ENTREGADO">ENTREGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
              </div>

              {/* Fotografía de Recepción (Guía) en Edición */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.4rem' }}>
                  Fotografía de Recepción (Guía)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label
                    htmlFor="edit-package-img-input"
                    className="btn"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer', background: '#faf5ff', color: 'var(--primary-burgundy)', border: '1px solid var(--primary-burgundy)', fontWeight: 700 }}
                  >
                    <Camera size={15} /> {editPackageFormData.imagenUrl ? 'Cambiar Fotografía' : 'Adjuntar Fotografía'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    id="edit-package-img-input"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditPackageFormData(prev => ({ ...prev, imagenUrl: reader.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {editPackageFormData.imagenUrl && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <img
                      src={getPackageImageSrc(editPackageFormData.imagenUrl)}
                      alt="Vista previa fotografía"
                      style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', background: '#ffffff' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                >
                  <Save size={18} />
                  {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
