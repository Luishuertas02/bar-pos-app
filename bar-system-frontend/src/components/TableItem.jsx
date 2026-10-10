import React from 'react';
import { getStatusInfo, isBarSeat, isOccupied } from '../utils/tables';

const SELECTED_GLOW = '0 0 0 3px rgba(255, 214, 10, 0.35), 0 0 22px rgba(255, 214, 10, 0.8)';

export default function TableItem({ table, onSelect, isSelected, isPending = false }) {
  const { id, capacidad = 4, personas = 0, estado, estadoNombre } = table;
  const statusInfo = getStatusInfo(estado, estadoNombre);
  const occupied = isOccupied(table);
  // En un grupo las personas se muestran en la etiqueta del grupo, no en cada mesa
  const showPeople = occupied && !table.grupo;
  const title = `${id} • ${showPeople ? `${personas} de ${capacidad}` : capacidad} personas • ${statusInfo.label}`;
  const borderColor = isSelected ? 'var(--neon-yellow)' : isPending ? 'var(--neon-blue)' : statusInfo.border;
  const borderStyle = isPending ? 'dashed' : 'solid';

  // Taburete de barra: círculo pequeño
  if (isBarSeat(id)) {
    return (
      <button
        type="button"
        className="table-wrapper"
        title={title}
        onClick={() => onSelect(table)}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          border: `2.5px ${borderStyle} ${borderColor}`,
          background: `radial-gradient(circle at 30% 30%, ${statusInfo.bg}, #0f0d2a)`,
          boxShadow: isSelected ? SELECTED_GLOW : statusInfo.glow,
          color: 'var(--text-primary)',
          fontSize: '10px',
          fontWeight: 800,
          padding: 0,
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {id}
      </button>
    );
  }

  // Mesa: rectángulo con sillas a los lados (capacidad repartida izquierda / derecha)
  const chairsPerSide = Math.ceil(Math.min(Math.max(capacidad || 4, 2), 8) / 2);
  const chairColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {Array.from({ length: chairsPerSide }, (_, i) => (
        <span
          key={i}
          style={{
            width: '8px',
            height: '10px',
            borderRadius: '4px',
            backgroundColor: isSelected ? 'var(--neon-yellow)' : '#1f1c4f',
            border: `1.5px solid ${isSelected ? '#ffe566' : '#3b3585'}`,
          }}
        />
      ))}
    </div>
  );

  return (
    <button
      type="button"
      className="table-wrapper"
      title={title}
      onClick={() => onSelect(table)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'transform 0.2s ease',
      }}
    >
      {chairColumn}
      <div
        style={{
          width: '50px',
          height: '46px',
          borderRadius: '12px',
          border: `2.5px ${borderStyle} ${borderColor}`,
          background: `radial-gradient(circle at 30% 30%, ${statusInfo.bg}, #0f0d2a)`,
          boxShadow: isSelected ? SELECTED_GLOW : statusInfo.glow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          transition: 'all 0.25s ease',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>{id}</span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: statusInfo.color }}>{showPeople ? `${personas}/${capacidad}` : capacidad}p</span>
      </div>
      {chairColumn}
    </button>
  );
}
