import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FilterBar from './components/FilterBar';
import RouteCard from './components/RouteCard';
import RouteDetailModal from './components/RouteDetailModal';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPanel from './components/AdminPanel';
import { fetchRoutes, fetchSiteConfig } from './services/api';
import { MapPin, Phone, MessageSquare, ShieldCheck, Heart, Sparkles, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('client'); // 'client' | 'admin'
  const [routes, setRoutes] = useState([]);
  const [siteConfig, setSiteConfig] = useState({ logoUrl: '/uploads/logo.svg', siteName: 'Amairany Express' });
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  // Auth state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    departamento: '',
    municipio: '',
    distrito: '',
    dia: ''
  });

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await fetchRoutes(filters);
      setRoutes(data);
    } catch (err) {
      console.error("Error al cargar rutas:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await fetchSiteConfig();
      if (config) setSiteConfig(config);
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [filters]);

  useEffect(() => {
    loadConfig();
  }, []);

  // Cargar sesión guardada de localStorage (Válida por 24 horas)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('amairany_admin_session');
      if (saved) {
        const { user, token, timestamp } = JSON.parse(saved);
        const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas de vigencia
        if (user && token && timestamp && (Date.now() - timestamp < SESSION_DURATION_MS)) {
          setAdminUser(user);
          setAdminToken(token);
        } else {
          localStorage.removeItem('amairany_admin_session');
        }
      }
    } catch (e) {
      console.warn("Error al cargar sesión guardada:", e);
    }
  }, []);

  const handleLoginSuccess = (user, token) => {
    setAdminUser(user);
    setAdminToken(token);
    try {
      localStorage.setItem('amairany_admin_session', JSON.stringify({
        user,
        token,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn("Error al guardar sesión:", e);
    }
    setActiveTab('admin');
  };

  const handleLogout = () => {
    setAdminUser(null);
    setAdminToken(null);
    try {
      localStorage.removeItem('amairany_admin_session');
    } catch (e) {
      console.warn("Error al borrar sesión:", e);
    }
    setActiveTab('client');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar 
        onOpenAdmin={() => setShowAdminLogin(true)}
        adminUser={adminUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        logoUrl={siteConfig?.logoUrl}
        setActiveTab={(tab) => {
          if (tab === 'admin' && !adminUser) {
            setShowAdminLogin(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Main View Controller */}
      {activeTab === 'client' ? (
        <main style={{ flexGrow: 1 }}>
          {/* Hero Banner */}
          <Hero 
            totalRoutes={routes.length} 
            onSearchClick={() => {
              const el = document.getElementById('puntos-entrega');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} 
          />

          <div className="container" style={{ paddingBottom: '5rem' }}>
            {/* Filter Bar */}
            <FilterBar filters={filters} setFilters={setFilters} />

            {/* Puntos de Entrega Grid Section */}
            <div style={{ marginTop: '3.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-burgundy)' }}>
                    Puntos de Entrega Disponibles
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Mostrando {routes.length} ubicaciones activas con horarios y días confirmados
                  </p>
                </div>

                <div className="badge badge-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  ⚡ Actualizado en Tiempo Real
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--primary-burgundy)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cargando Puntos de Entrega...</div>
                </div>
              ) : routes.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: 'var(--radius-xl)' }}>
                  <MapPin size={48} color="var(--primary-burgundy)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                    No se encontraron rutas con los filtros seleccionados
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Pruebe seleccionando otro Departamento, Municipio o borrando el término de búsqueda.
                  </p>
                  <button 
                    onClick={() => setFilters({ search: '', departamento: '', municipio: '', distrito: '', dia: '' })}
                    className="btn btn-primary"
                    style={{ marginTop: '1.5rem' }}
                  >
                    Ver Todas las Rutas
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.75rem'
                }}>
                  {routes.map(route => (
                    <RouteCard 
                      key={route.id} 
                      route={route} 
                      onSelect={(r) => setSelectedRoute(r)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        <main style={{ flexGrow: 1, background: '#f8fafc' }}>
          <AdminPanel 
            routes={routes} 
            onRefreshRoutes={loadRoutes} 
            adminToken={adminToken} 
            adminUser={adminUser}
            siteConfig={siteConfig}
            onConfigUpdated={(cfg) => setSiteConfig(cfg)}
          />
        </main>
      )}

      {/* Footer Amairany Express */}
      <footer style={{
        background: 'var(--hero-gradient)',
        color: '#ffffff',
        padding: '3.5rem 0 2rem 0',
        marginTop: 'auto',
        borderTop: '3px solid var(--accent-crimson)',
        maxWidth: '100vw',
        overflow: 'hidden'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
              }}>
                <img 
                  src={siteConfig?.logoUrl || '/uploads/logo.svg'} 
                  alt="Amairany Express Logo"
                  style={{ height: '48px', maxWidth: '240px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.svg';
                  }}
                />
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.92rem', lineHeight: 1.55 }}>
                Servicio líder en encomiendas y logística de paquetería rápida y segura en todo El Salvador. 
                Conectando personas y negocios en los 14 departamentos.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.85rem', color: '#ff4081' }}>
                Atención al Cliente & Casillero
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.92rem' }}>
                <li>
                  <a 
                    href="https://waze.com/ul?q=C.C+Metrogalerias+Local+2-21+San+Salvador" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4081'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                  >
                    📍 <strong>Recepción:</strong> C.C Metrogalerias Local 2-21
                    <span style={{ fontSize: '0.75rem', background: '#00d2ff', color: '#0f172a', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 800 }}>Waze 🚗</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://wa.me/50373182828" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4081'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                  >
                    📱 <strong>WhatsApp:</strong> 7318-2828
                    <span style={{ fontSize: '0.75rem', background: '#25D366', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 800 }}>Enviar Mensaje</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.facebook.com/AmairanyExpress" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4081'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                  >
                    📘 <strong>Facebook:</strong> Amairany Express
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.instagram.com/amairanyexpress.sv/" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4081'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                  >
                    📸 <strong>Instagram:</strong> @Amairanyexpress.sv
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.85rem', color: '#ff4081' }}>
                Organización El Salvador
              </h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                Plataforma logística integrada con la reestructuración oficial de Departamentos, Municipios y Distritos de El Salvador.
              </p>
            </div>
          </div>

          <div style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.85)'
          }}>
            <div>© {new Date().getFullYear()} Amairany Express. Todos los derechos reservados.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span>Sitio web creado y desarrollado por</span>
              <a 
                href="https://nevorasoftware.com/" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  color: '#ff4081', 
                  fontWeight: 800, 
                  textDecoration: 'none',
                  borderBottom: '1px dashed #ff4081',
                  paddingBottom: '1px'
                }}
              >
                Nevora Software
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedRoute && (
        <RouteDetailModal 
          route={selectedRoute} 
          onClose={() => setSelectedRoute(null)} 
        />
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLoginModal 
          onClose={() => setShowAdminLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

