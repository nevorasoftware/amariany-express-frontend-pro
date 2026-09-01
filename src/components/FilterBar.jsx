import React from 'react';
import { Search, Filter, Calendar, Map, X } from 'lucide-react';
import { elSalvadorData } from '../data/elSalvadorData';

export default function FilterBar({ filters, setFilters }) {
  const selectedDeptObj = elSalvadorData.find(d => d.departamento === filters.departamento);
  const municipiosList = selectedDeptObj ? selectedDeptObj.municipios : [];
  
  const selectedMunObj = municipiosList.find(m => m.nombre === filters.municipio);
  const distritosList = selectedMunObj ? selectedMunObj.distritos : [];

  const handleDeptChange = (e) => {
    setFilters(prev => ({
      ...prev,
      departamento: e.target.value,
      municipio: '',
      distrito: ''
    }));
  };

  const handleMunChange = (e) => {
    setFilters(prev => ({
      ...prev,
      municipio: e.target.value,
      distrito: ''
    }));
  };

  const handleDistChange = (e) => {
    setFilters(prev => ({
      ...prev,
      distrito: e.target.value
    }));
  };

  const handleReset = () => {
    setFilters({
      search: '',
      departamento: '',
      municipio: '',
      distrito: '',
      dia: ''
    });
  };

  const hasActiveFilters = filters.search || filters.departamento || filters.municipio || filters.distrito || filters.dia;

  return (
    <div 
      id="puntos-entrega"
      className="filter-bar-container"
      style={{
        marginTop: '-35px',
        position: 'relative',
        zIndex: 10
      }}
    >
      <div className="glass-panel" style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Filter size={20} color="var(--primary-burgundy)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-burgundy)' }}>
              Filtros por Organización Territorial y Días
            </h3>
          </div>

          {hasActiveFilters && (
            <button 
              onClick={handleReset}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: 'none',
                padding: '0.4rem 0.9rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <X size={14} />
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Controls Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* Text Search Input */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input 
              type="text"
              placeholder="Buscar por lugar o dirección..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input-control"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>

          {/* Departamento Filter */}
          <div>
            <select 
              value={filters.departamento} 
              onChange={handleDeptChange}
              className="select-control"
            >
              <option value="">Todos los Departamentos</option>
              {elSalvadorData.map(d => (
                <option key={d.departamento} value={d.departamento}>
                  📍 {d.departamento}
                </option>
              ))}
            </select>
          </div>

          {/* Municipio Filter */}
          <div>
            <select 
              value={filters.municipio} 
              onChange={handleMunChange}
              disabled={!filters.departamento}
              className="select-control"
              style={{ opacity: !filters.departamento ? 0.6 : 1 }}
            >
              <option value="">
                {filters.departamento ? "Todos los Municipios" : "Seleccione Departamento primero"}
              </option>
              {municipiosList.map(m => (
                <option key={m.nombre} value={m.nombre}>
                  🏢 {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Distrito Filter */}
          <div>
            <select 
              value={filters.distrito} 
              onChange={handleDistChange}
              disabled={!filters.municipio}
              className="select-control"
              style={{ opacity: !filters.municipio ? 0.6 : 1 }}
            >
              <option value="">
                {filters.municipio ? "Todos los Distritos" : "Seleccione Municipio primero"}
              </option>
              {distritosList.map(dist => (
                <option key={dist} value={dist}>
                  📌 {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Día Filter */}
          <div>
            <select 
              value={filters.dia}
              onChange={(e) => setFilters(prev => ({ ...prev, dia: e.target.value }))}
              className="select-control"
            >
              <option value="">Cualquier Día de la Semana</option>
              <option value="LUNES">Lunes</option>
              <option value="MARTES">Martes</option>
              <option value="MIÉRCOLES">Miércoles</option>
              <option value="JUEVES">Jueves</option>
              <option value="VIERNES">Viernes</option>
              <option value="SÁBADO">Sábado</option>
            </select>
          </div>
        </div>

        {/* Selected Administrative Breadcrumb Tag */}
        {(filters.departamento || filters.municipio || filters.distrito) && (
          <div style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            fontSize: '0.88rem'
          }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Filtro Territorial Activo:</span>
            {filters.departamento && (
              <span className="badge badge-primary">Dep. {filters.departamento}</span>
            )}
            {filters.municipio && (
              <span className="badge badge-crimson">Mun. {filters.municipio}</span>
            )}
            {filters.distrito && (
              <span className="badge badge-emerald">Dist. {filters.distrito}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

