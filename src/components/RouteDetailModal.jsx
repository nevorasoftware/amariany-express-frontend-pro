import React from 'react';
import { X, Calendar, Clock, MapPin, Phone, Share2, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { getRouteImageSrc } from './AdminPanel';

export default function RouteDetailModal({ route, onClose }) {
  if (!route) return null;

  const imageUrl = getRouteImageSrc(route.imagenUrl, route.lugarPrincipal);
  const whatsappText = encodeURIComponent(
    `Hola Amairany Express! Quisiera información sobre la entrega en ${route.lugarPrincipal} (${route.dias} - ${route.horario}).`
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div 
        className="animate-modal-pop"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative'
        }}
      >
        {/* Modal Close Button */}
        <button 
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--primary-burgundy)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))'
        }}>
          {/* Left Side: Large Image Preview */}
          <div style={{
            background: '#0f172a',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '240px'
          }}>
            <img 
              src={imageUrl} 
              alt={route.lugarPrincipal}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getRouteImageSrc('', route.lugarPrincipal);
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />
            <div style={{ marginTop: '0.85rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', textAlign: 'center' }}>
              Imagen oficial de la ruta en Amairany Express
            </div>
          </div>

          {/* Right Side: Details & Extraction Data */}
          <div style={{ padding: '1.5rem 1.5rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-crimson">{route.tipoPunto || 'PUNTO DE ENTREGA'}</span>
                <span className="badge badge-emerald">ACTIVO</span>
              </div>

              {/* Lugar Principal en negrita destacada */}
              <h2 className="lugar-principal-bold" style={{ fontSize: '1.6rem', lineHeight: 1.15, marginBottom: '1rem' }}>
                {route.lugarPrincipal}
              </h2>

              {/* Info Hierarchy Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                {/* Días y Horarios */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Calendar size={18} color="var(--primary-burgundy)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Días de Entrega</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>{route.dias}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={18} color="var(--accent-crimson)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Horario de Atención</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{route.horario}</div>
                    </div>
                  </div>
                </div>

                {/* Dirección y Lugar de Referencia */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <MapPin size={20} color="var(--primary-burgundy)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lugar de Referencia</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {route.lugarReferencia}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ubicación Administrativa Salvador */}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(107, 0, 56, 0.05)',
                  border: '1px dashed var(--primary-burgundy)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 800, color: 'var(--primary-burgundy)', marginBottom: '0.2rem' }}>
                    🇸🇻 Ubicación Administrativa de El Salvador:
                  </div>
                  <div><strong>Departamento:</strong> {route.departamentoNombre || 'No asignado'}</div>
                  <div><strong>Municipio:</strong> {route.municipioNombre || 'No asignado'}</div>
                  <div><strong>Distrito:</strong> {route.distritoNombre || 'No asignado'}</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href={`https://wa.me/50373182828?text=${whatsappText}`}
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Phone size={18} />
                Coordinar Entrega en este Punto (WhatsApp)
              </a>

              <button 
                onClick={onClose}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

