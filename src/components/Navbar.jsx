import React, { useState } from 'react';
import { Truck, Phone, ShieldCheck, MapPin, UserCheck, LogOut, Menu, X, MessageCircle } from 'lucide-react';

export default function Navbar({ onOpenAdmin, adminUser, onLogout, activeTab, setActiveTab, logoUrl }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const currentLogoSrc = logoUrl || '/uploads/logo.svg';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(76, 0, 112, 0.1)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '76px'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => {
            setActiveTab('client');
            closeMobileMenu();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <img 
            src={currentLogoSrc} 
            alt="Amairany Express Logo" 
            style={{ height: '48px', maxWidth: '240px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.svg';
            }}
          />
        </div>

        {/* Desktop Navigation Items */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="desktop-only">
          <button 
            onClick={() => setActiveTab('client')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: activeTab === 'client' ? 800 : 600,
              fontSize: '0.95rem',
              color: activeTab === 'client' ? 'var(--primary-burgundy)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.5rem 0',
              borderBottom: activeTab === 'client' ? '3px solid var(--accent-crimson)' : '3px solid transparent',
              transition: 'var(--transition-smooth)'
            }}
          >
            Inicio & Rutas
          </button>
          
          <a 
            href="#puntos-entrega" 
            onClick={() => setActiveTab('client')}
            style={{
              textDecoration: 'none',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: '0.95rem',
              color: 'var(--text-muted)'
            }}
          >
            Puntos de Entrega
          </a>

          <a 
            href="https://wa.me/50373182828" 
            target="_blank" 
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: '0.95rem',
              color: 'var(--text-muted)'
            }}
          >
            Contacto & Tarifas
          </a>

          {adminUser && (
            <button 
              onClick={() => setActiveTab('admin')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: activeTab === 'admin' ? 800 : 600,
                fontSize: '0.95rem',
                color: activeTab === 'admin' ? 'var(--primary-burgundy)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.5rem 0',
                borderBottom: activeTab === 'admin' ? '3px solid var(--accent-crimson)' : '3px solid transparent'
              }}
            >
              Panel de Administración
            </button>
          )}
        </nav>

        {/* Right Action Buttons (Desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="desktop-only">
          <a 
            href="https://wa.me/50373182828?text=Hola%20Amairany%20Express,%20quisiera%20más%20información" 
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem' }}
          >
            <Phone size={16} />
            +503 7318-2828
          </a>

          {adminUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: 'rgba(107, 0, 56, 0.08)',
                padding: '0.4rem 0.8rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--primary-burgundy)'
              }}>
                <UserCheck size={16} />
                {adminUser.name || 'Administrador'}
              </div>
              <button 
                onClick={onLogout}
                title="Cerrar Sesión"
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onOpenAdmin}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <ShieldCheck size={16} />
              Acceso Administrativo
            </button>
          )}
        </div>

        {/* Mobile View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="mobile-only">
          <a 
            href="https://wa.me/50373182828?text=Hola%20Amairany%20Express,%20quisiera%20más%20información" 
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', gap: '0.35rem' }}
          >
            <Phone size={15} />
            +503 7318-2828
          </a>

          <button
            onClick={toggleMobileMenu}
            aria-label="Abrir Menú"
            style={{
              background: 'rgba(107, 0, 56, 0.08)',
              color: 'var(--primary-burgundy)',
              border: 'none',
              borderRadius: '12px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div 
          className="mobile-only animate-slide-down"
          style={{
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            borderBottom: '2px solid var(--primary-burgundy)',
            padding: '1.25rem 1.5rem 1.75rem 1.5rem',
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <button 
            onClick={() => {
              setActiveTab('client');
              closeMobileMenu();
            }}
            style={{
              background: activeTab === 'client' ? 'rgba(107, 0, 56, 0.08)' : 'transparent',
              color: activeTab === 'client' ? 'var(--primary-burgundy)' : 'var(--text-main)',
              border: 'none',
              textAlign: 'left',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <Truck size={20} color="var(--primary-burgundy)" />
            Inicio & Rutas
          </button>

          <a 
            href="#puntos-entrega"
            onClick={() => {
              setActiveTab('client');
              closeMobileMenu();
            }}
            style={{
              textDecoration: 'none',
              color: 'var(--text-main)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <MapPin size={20} color="var(--accent-crimson)" />
            Puntos de Entrega
          </a>

          <a 
            href="https://wa.me/50373182828" 
            target="_blank" 
            rel="noreferrer"
            onClick={closeMobileMenu}
            style={{
              textDecoration: 'none',
              color: 'var(--text-main)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <MessageCircle size={20} color="#25D366" />
            Contacto & Tarifas (WhatsApp)
          </a>

          <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

          {adminUser ? (
            <>
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  closeMobileMenu();
                }}
                style={{
                  background: activeTab === 'admin' ? 'rgba(107, 0, 56, 0.08)' : 'transparent',
                  color: 'var(--primary-burgundy)',
                  border: 'none',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <UserCheck size={20} />
                Panel de Administración
              </button>

              <button 
                onClick={() => {
                  onLogout();
                  closeMobileMenu();
                }}
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={20} />
                Cerrar Sesión ({adminUser.name || 'Admin'})
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                onOpenAdmin();
                closeMobileMenu();
              }}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <ShieldCheck size={18} />
              Acceso Administrativo
            </button>
          )}
        </div>
      )}
    </header>
  );
}

