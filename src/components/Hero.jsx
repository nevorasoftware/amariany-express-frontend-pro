import React from 'react';
import { Search, MapPin, Clock, Package, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Hero({ totalRoutes, onSearchClick }) {
  return (
    <section style={{
      background: 'var(--hero-gradient)',
      color: '#ffffff',
      padding: '3.5rem 0 4.5rem 0',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '100vw'
    }}>
      {/* Background Decorative Shapes */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(216,27,96,0.22) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-5%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,64,129,0.15) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center'
        }}>
          {/* Left Column Content */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.9rem',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              maxWidth: '100%'
            }}>
              <Sparkles size={16} color="#ff4081" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Logística y Encomiendas de Nueva Generación
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)',
              fontWeight: 900,
              lineHeight: 1.18,
              marginBottom: '1.25rem',
              color: '#ffffff'
            }}>
              Nuestros Puntos de Entrega <br />
              <span style={{
                background: 'linear-gradient(90deg, #ff4081, #ff80ab)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Amairany Express
              </span>
            </h1>

            <p style={{
              fontSize: '1.02rem',
              color: 'rgba(255, 255, 255, 0.88)',
              marginBottom: '2rem',
              maxWidth: '560px',
              lineHeight: 1.55
            }}>
              Encuentra la ruta, punto de encuentro o centro de entrega más cercano. 
              Conectamos tus paquetes con tus clientes de forma rápida, segura y confiable en todo El Salvador.
            </p>

            <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#puntos-entrega" className="btn btn-primary">
                Buscar Puntos de Entrega
                <ArrowRight size={18} />
              </a>

              <a 
                href="https://chat.whatsapp.com/G7jQhicd6y97JiwN0wXqfo?s=cl&p=a&ilr=1" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-outline-white"
              >
                Rutas en Vivo por WhatsApp
              </a>
            </div>
          </div>

          {/* Right Column Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(1, 1fr)',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <MapPin size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1 }}>14 Departamentos</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Cobertura Nacional en El Salvador</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1 }}>Días y Horarios Exactos</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Lunes a Sábado con entregas programadas</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <Package size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1 }}>{totalRoutes} Rutas Registradas</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Puntos de encuentro y recepción en casillero</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

