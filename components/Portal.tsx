
import React from 'react';
import { AreaConfig } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';
import './Portal.css';

interface PortalProps {
  onSelectArea: (area: AreaConfig) => void;
  onPrefetchArea?: (areaId: string) => void;
}

const Portal: React.FC<PortalProps> = ({ onSelectArea, onPrefetchArea }) => {
  const executiveArea = {
    id: 'executive',
    name: 'Sala de Situación',
    icon: 'Activity',
    color: 'blue',
    description: 'Resumen ejecutivo central.',
  } as any;

  const portalAreas = AREAS.filter((area) => area.id !== 'ventas').map((area) => ({
    ...area,
    description:
      area.id === 'postventa'
        ? 'Taller, PPT y servicios.'
        : area.id === 'rrhh'
        ? 'Talento y desempeño.'
        : area.id === 'calidad'
        ? 'Auditorías y satisfacción.'
        : area.id === 'ambiente'
        ? 'Agua y energía.'
        : 'Ventas y leads.',
  }));

  return (
    <main className="portal-light">
      <header className="portal-header">
        <div className="portal-brand">
          <span className="portal-brand-symbol" aria-hidden="true">VW</span>
          <span>Autosol <span className="portal-brand-descriptor">| Gestión</span></span>
        </div>
        <span className="portal-header-label">Centro de Control Operativo</span>
      </header>

      <section className="portal-hero" aria-labelledby="portal-title">
        <img
          src={`${import.meta.env.BASE_URL}images/fachada-autosol.png`}
          alt="Fachada del concesionario Autosol Volkswagen"
          width={4000}
          height={2252}
          fetchPriority="high"
          className="portal-photo"
        />
        <div className="portal-photo-overlay" />
        <div className="portal-hero-content">
          <p className="portal-eyebrow"><span /> Autosol Volkswagen</p>
          <h1 id="portal-title">Una visión.<br /><span>Todas las áreas.</span></h1>
          <p className="portal-intro">Información que conecta a nuestro equipo y transforma cada decisión.</p>
          <button
            type="button"
            onMouseEnter={() => onPrefetchArea?.(executiveArea.id)}
            onFocus={() => onPrefetchArea?.(executiveArea.id)}
            onTouchStart={() => onPrefetchArea?.(executiveArea.id)}
            onClick={() => onSelectArea(executiveArea)}
            className="portal-executive"
          >
            <Icons.Activity className="h-5 w-5 shrink-0" />
            <span>Ingresar a Sala de Situación</span>
            <Icons.ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
        <div className="portal-photo-caption">Autosol · Volkswagen</div>
      </section>

      <section className="portal-areas" aria-labelledby="portal-areas-title">
        <div className="portal-areas-heading">
          <h2 id="portal-areas-title">Elegí tu área</h2>
          <p>Todo lo que necesitás, en un solo lugar.</p>
        </div>
        <div className="portal-area-grid">
          {portalAreas.map((area) => {
            const AreaIcon = Icons[area.icon as keyof typeof Icons] || Icons.Home;
            return (
              <button
                key={area.id}
                type="button"
                onMouseEnter={() => onPrefetchArea?.(area.id)}
                onFocus={() => onPrefetchArea?.(area.id)}
                onTouchStart={() => onPrefetchArea?.(area.id)}
                onClick={() => onSelectArea(area)}
                className="portal-area-card"
              >
                <span className={`portal-area-icon portal-area-icon--${area.id}`}><AreaIcon className="h-5 w-5" /></span>
                <span className="portal-area-copy"><span className="portal-area-name">{area.name}</span><span className="portal-area-description">{area.description}</span></span>
                <Icons.ArrowRight className="portal-area-arrow h-4 w-4 shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
      <footer className="portal-footer">Autosol Volkswagen <span>Gestión conectada.</span></footer>
    </main>
  );
};

export default Portal;

