import React from 'react';
import { Calendar, Clock, MapPin, Eye, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { getRouteImageSrc } from './AdminPanel';

export default function RouteCard({ route, onSelect }) {
  const imageUrl = getRouteImageSrc(route.imagenUrl, route.lugarPrincipal);

  return (
    <div 
      className="animate-fade-in"
      style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid rgba(107, 0, 56, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'var(--transition-smooth)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
    >
      {/* Banner / Image Thumbnail */}
      <div 
        onClick={() => onSelect(route)}
        style={{
          position: 'relative',
          height: '210px',
          background: 'linear-gradient(135deg, #4a0026 0%, #6b0038 100%)',
          cursor: 'pointer',
          overflow: 'hidden'
        }}
      >
        <img 
          src={imageUrl} 
          alt={route.lugarPrincipal}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getRouteImageSrc('', route.lugarPrincipal);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
        />

        {/* Tipo de Punto & Código Overlay Badge */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 2,
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {route.codigo && (
            <span className="badge" style={{
              background: 'var(--primary-burgundy, #4C0070)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontWeight: 800
            }}>
              {route.codigo}
            </span>
          )}
          <span className="badge" style={{
            background: 'var(--accent-gradient)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {route.tipoPunto || 'PUNTO DE ENTREGA'}
          </span>
        </div>

        {/* Hover Click overlay hint */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          color: '#ffffff',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Eye size={18} />
        </div>
      </div>

      {/* Card Content Body */}
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'space-between'
      }}>
        <div>
          {/* Tag de Departamento y Distrito */}
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--accent-crimson)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.4rem'
          }}>
            {route.departamentoNombre || 'El Salvador'} • {route.distritoNombre || route.municipioNombre || 'Distrito'}
          </div>

          {/* Lugar Principal en Letras Negritas */}
          <h2 
            className="lugar-principal-bold"
            style={{
              fontSize: '1.45rem',
              lineHeight: 1.2,
              marginBottom: '1rem'
            }}
          >
            {route.lugarPrincipal}
          </h2>

          {/* Días y Horarios */}
          <div style={{
            background: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
              <Calendar size={18} color="var(--primary-burgundy)" />
              <span style={{ fontWeight: 800, color: 'var(--primary-burgundy)' }}>
                {route.dias}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <Clock size={18} color="var(--accent-crimson)" />
              <span style={{ fontWeight: 700 }}>
                {route.horario}
              </span>
            </div>
          </div>

          {/* Lugar de Referencia */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            fontSize: '0.88rem',
            color: '#475569',
            lineHeight: 1.45
          }}>
            <MapPin size={18} color="var(--primary-burgundy)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>Lugar de Referencia:</strong>
              {route.lugarReferencia}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => onSelect(route)}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
        >
          <ImageIcon size={16} />
          Ver Imagen y Detalle Completo
        </button>
      </div>
    </div>
  );
}
