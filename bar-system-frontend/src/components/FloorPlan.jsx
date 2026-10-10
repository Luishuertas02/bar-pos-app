import React from 'react';
import TableItem from './TableItem';
import { Wine, DoorOpen, Toilet } from 'lucide-react';
import { TABLE_LAYOUT, isBarSeat, getGroupMembers, sortById } from '../utils/tables';

const WALL = '#3b3585';

// Estructuras fijas del local, en % del ancho / alto
const structureStyle = {
  position: 'absolute',
  border: `3px solid ${WALL}`,
  backgroundColor: 'rgba(20, 17, 51, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

// Proporción ancho / alto del local (el bar es angosto y profundo)
const ROOM_ASPECT = 0.62;

const LEGEND = [
  { label: 'Libre', color: 'var(--status-available)' },
  { label: 'Ocupada', color: 'var(--status-occupied)' },
];

// Recuadro que envuelve a un conjunto de mesas. Las posiciones están en % y los
// tamaños de las mesas en px, así que los bordes se calculan con min()/max() de CSS.
function groupBoxStyle(members) {
  const edges = members
    .filter((m) => TABLE_LAYOUT[m.id])
    .map((m) => {
      const { x, y } = TABLE_LAYOUT[m.id];
      const [hw, hh] = isBarSeat(m.id) ? [26, 26] : [48, 34];
      return {
        left: `calc(${x}% - ${hw}px)`,
        right: `calc(${x}% + ${hw}px)`,
        top: `calc(${y}% - ${hh}px)`,
        bottom: `calc(${y}% + ${hh}px)`,
      };
    });

  if (edges.length === 0) return null;

  const minLeft = `min(${edges.map((e) => e.left).join(', ')})`;
  const maxRight = `max(${edges.map((e) => e.right).join(', ')})`;
  const minTop = `min(${edges.map((e) => e.top).join(', ')})`;
  const maxBottom = `max(${edges.map((e) => e.bottom).join(', ')})`;

  return {
    position: 'absolute',
    left: minLeft,
    top: minTop,
    width: `calc(${maxRight} - ${minLeft})`,
    height: `calc(${maxBottom} - ${minTop})`,
    borderRadius: '14px',
    pointerEvents: 'none',
    zIndex: 1,
  };
}

export default function FloorPlan({ tables, onSelectTable, selectedIds = [], pendingIds = [], previewIds = [] }) {
  const placed = tables.filter((t) => TABLE_LAYOUT[t.id]);
  const unplaced = tables.filter((t) => !TABLE_LAYOUT[t.id]);

  // Grupos guardados en Dataverse (mesa principal -> mesas)
  const leaderIds = [...new Set(tables.filter((t) => t.grupo).map((t) => t.grupo))];
  const groups = leaderIds
    .map((leaderId) => getGroupMembers(tables, leaderId).sort(sortById))
    .filter((members) => members.length > 1);

  // Vista previa mientras se eligen mesas para asociar
  const previewMembers = tables.filter((t) => previewIds.includes(t.id));

  const renderTable = (table) => (
    <TableItem
      key={table.id}
      table={table}
      onSelect={onSelectTable}
      isSelected={selectedIds.includes(table.id)}
      isPending={pendingIds.includes(table.id)}
    />
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '640px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '24px',
        border: '2px solid var(--bg-card-border)',
        boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Plano 2D • {tables.length} puestos
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
          Toca una mesa para seleccionarla
        </span>
      </div>

      {/* Local: conserva su proporción y se centra en el espacio disponible */}
      <div style={{ flex: 1, minHeight: '560px', containerType: 'size', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: `min(100cqw, calc(100cqh * ${ROOM_ASPECT}))`,
          height: `min(100cqh, calc(100cqw / ${ROOM_ASPECT}))`,
          border: `4px solid ${WALL}`,
          borderRadius: '6px',
          backgroundImage: 'radial-gradient(#1c1946 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
        }}
      >
        {/* Pared diagonal superior */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <polyline
            points="49,0 49,9.7 9.8,20.6"
            fill="none"
            stroke={WALL}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Entrada */}
        <div style={{ ...structureStyle, left: 0, top: '20.6%', width: '9%', height: '10.2%', color: 'var(--neon-cyan)' }}>
          <DoorOpen size={16} />
        </div>

        {/* Baño */}
        <div style={{ ...structureStyle, left: 0, top: '78%', width: '24%', height: '22%', gap: '4px' }}>
          <Toilet size={14} /> Baño
        </div>

        {/* Barra */}
        <div
          style={{
            ...structureStyle,
            right: 0,
            bottom: 0,
            width: '23.7%',
            height: '27.4%',
            flexDirection: 'column',
            gap: '6px',
            border: '3px solid var(--neon-pink)',
            boxShadow: '0 0 6px var(--neon-pink), 0 0 16px rgba(255, 46, 151, 0.6), inset 0 0 16px rgba(255, 46, 151, 0.35)',
            zIndex: 1,
          }}
        >
          <Wine size={20} color="var(--neon-pink)" />
          <span
            style={{
              background: 'linear-gradient(90deg, var(--neon-pink), var(--neon-cyan))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Barra
          </span>
        </div>

        {/* Mesas asociadas: recuadro azul */}
        {groups.map((members) => {
          const style = groupBoxStyle(members);
          if (!style) return null;
          const leader = members.find((m) => m.id === m.grupo) || members[0];
          const capacity = members.reduce((sum, m) => sum + (m.capacidad || 0), 0);
          const people = members.reduce((sum, m) => sum + (m.personas || 0), 0);

          return (
            <div
              key={leader.id}
              style={{
                ...style,
                border: '2.5px solid var(--neon-blue)',
                backgroundColor: 'rgba(63, 107, 255, 0.08)',
                boxShadow: '0 0 14px rgba(63, 107, 255, 0.55), inset 0 0 14px rgba(63, 107, 255, 0.2)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '10px',
                  padding: '1px 7px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--neon-blue)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {members.map((m) => m.id).join(' + ')} • {people > 0 ? `${people}/${capacity}` : capacity}p
              </span>
            </div>
          );
        })}

        {previewMembers.length > 1 && (
          <div
            style={{
              ...groupBoxStyle(previewMembers),
              border: '2.5px dashed var(--neon-blue)',
              backgroundColor: 'rgba(63, 107, 255, 0.05)',
            }}
          />
        )}

        {/* Mesas y taburetes ubicados por su nombre */}
        {placed.map((table) => (
          <div
            key={table.id}
            style={{
              position: 'absolute',
              left: `${TABLE_LAYOUT[table.id].x}%`,
              top: `${TABLE_LAYOUT[table.id].y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            {renderTable(table)}
          </div>
        ))}
      </div>
      </div>

      {/* Mesas de Dataverse sin posición definida en el plano */}
      {unplaced.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
            SIN UBICAR EN EL PLANO
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>{unplaced.map(renderTable)}</div>
        </div>
      )}

      {/* Leyenda de estados */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {LEGEND.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.color,
                boxShadow: `0 0 8px ${item.color}`,
              }}
            />
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
