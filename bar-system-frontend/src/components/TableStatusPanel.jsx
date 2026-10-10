import React, { useState } from 'react';
import { Minus, Plus, Users, LogOut, RefreshCw, Link2, Unlink, Check, X } from 'lucide-react';
import { getTableLabel, isOccupied } from '../utils/tables';

const STATUS_DISPONIBLE = 962000000;

const stepButtonStyle = (disabled) => ({
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid var(--bg-card-border)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

const actionButtonStyle = (color, bg, disabled) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 16px',
  borderRadius: '12px',
  border: `1.5px solid ${color}`,
  backgroundColor: bg,
  color,
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  whiteSpace: 'nowrap',
});

export default function TableStatusPanel({
  table,
  group = [],
  associating = false,
  pendingIds = [],
  canAssociate = true,
  onUpdateStatus,
  onUpdatePeople,
  onStartAssociate,
  onCancelAssociate,
  onConfirmAssociate,
  onDissociate,
}) {
  // Si la mesa está asociada, la capacidad es la suma de todas las mesas del grupo
  const members = group.length > 0 ? group : table ? [table] : [];
  const isGroup = members.length > 1;
  const capacity = Math.max(members.reduce((sum, m) => sum + (m.capacidad || 0), 0), 1);
  const occupied = table ? isOccupied(table) : false;

  const [people, setPeople] = useState(() => Math.min(Math.max(table?.personas || 1, 1), capacity));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action) => {
    try {
      setLoading(true);
      setError(null);
      await action();
    } catch (err) {
      setError(err.message || 'Error al actualizar la mesa');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const value = parseInt(e.target.value, 10);
    setPeople(Number.isNaN(value) ? 1 : Math.min(Math.max(value, 1), capacity));
  };

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: '120px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {table ? (occupied ? 'Mesa ocupada' : '¿Cuántas personas?') : 'Cambiar estado'}
        </p>
        <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
          {table ? (isGroup ? members.map((m) => m.id).join(' + ') : getTableLabel(table.id)) : 'Ninguna mesa'}
        </p>
      </div>

      {table ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          {/* Selector de personas: 1 .. capacidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              style={stepButtonStyle(loading || people <= 1)}
              disabled={loading || people <= 1}
              onClick={() => setPeople((p) => p - 1)}
              aria-label="Quitar persona"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              max={capacity}
              value={people}
              onChange={handleInput}
              disabled={loading}
              style={{
                width: '52px',
                height: '36px',
                textAlign: 'center',
                borderRadius: '10px',
                border: '1px solid var(--bg-card-border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 800,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              style={stepButtonStyle(loading || people >= capacity)}
              disabled={loading || people >= capacity}
              onClick={() => setPeople((p) => p + 1)}
              aria-label="Añadir persona"
            >
              <Plus size={16} />
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              / {capacity} máx.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {occupied ? (
              <>
                <button
                  type="button"
                  disabled={loading || people === table.personas}
                  onClick={() => run(() => onUpdatePeople(table.id, people))}
                  style={actionButtonStyle(
                    'var(--text-primary)',
                    'var(--bg-secondary)',
                    loading || people === table.personas
                  )}
                >
                  <Users size={15} /> Actualizar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => run(() => onUpdateStatus(table.id, STATUS_DISPONIBLE))}
                  style={actionButtonStyle('var(--status-available)', 'var(--status-available-bg)', loading)}
                >
                  <LogOut size={15} /> Liberar mesa
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => run(() => onUpdatePeople(table.id, people))}
                style={actionButtonStyle('var(--status-occupied)', 'var(--status-occupied-bg)', loading)}
              >
                <Users size={15} /> Ocupar mesa
              </button>
            )}
          </div>

          {loading && <RefreshCw size={16} color="var(--neon-cyan)" style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
      ) : (
        <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)' }}>
          Selecciona una mesa en el plano para ocuparla o liberarla
        </p>
      )}

      {/* Asociar mesas */}
      {table && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            paddingTop: '12px',
            borderTop: '1px dashed var(--bg-card-border)',
          }}
        >
          {associating ? (
            <>
              <p style={{ flex: 1, fontSize: '13px', color: 'var(--neon-blue)', fontWeight: 600, minWidth: '180px' }}>
                {pendingIds.length > 0
                  ? `Se unirán: ${pendingIds.join(', ')}`
                  : 'Toca en el plano las mesas libres que quieres unir'}
              </p>
              <button
                type="button"
                disabled={loading || pendingIds.length === 0}
                onClick={() => run(onConfirmAssociate)}
                style={actionButtonStyle('var(--neon-blue)', 'rgba(63, 107, 255, 0.15)', loading || pendingIds.length === 0)}
              >
                <Check size={15} /> Confirmar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onCancelAssociate}
                style={actionButtonStyle('var(--text-muted)', 'var(--bg-secondary)', loading)}
              >
                <X size={15} /> Cancelar
              </button>
            </>
          ) : (
            <>
              <p style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', minWidth: '180px' }}>
                {canAssociate
                  ? isGroup
                    ? `Mesas asociadas • capacidad total ${capacity}`
                    : 'Une otras mesas libres para sumar su capacidad'
                  : 'Asociar mesas requiere conexión con el backend'}
              </p>
              <button
                type="button"
                disabled={loading || !canAssociate}
                onClick={onStartAssociate}
                style={actionButtonStyle('var(--neon-blue)', 'rgba(63, 107, 255, 0.15)', loading || !canAssociate)}
              >
                <Link2 size={15} /> Asociar mesas
              </button>
            </>
          )}
        </div>
      )}

      {/* Mesas hijas del grupo: cada una se puede desasociar por separado */}
      {isGroup && !associating && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Desasociar:</span>
          {members
            .filter((m) => m.id !== table.id)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={loading || !canAssociate}
                onClick={() => run(() => onDissociate(m.id))}
                title={`Quitar ${m.id} del grupo`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 8px 5px 10px',
                  borderRadius: '9999px',
                  border: '1.5px solid var(--neon-blue)',
                  backgroundColor: 'rgba(63, 107, 255, 0.15)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: loading || !canAssociate ? 'not-allowed' : 'pointer',
                  opacity: loading || !canAssociate ? 0.5 : 1,
                }}
              >
                {m.id} <span style={{ opacity: 0.6 }}>({m.capacidad}p)</span>
                <Unlink size={13} color="var(--neon-blue)" />
              </button>
            ))}
        </div>
      )}

      {error && <p style={{ width: '100%', fontSize: '12px', color: '#fca5a5' }}>{error}</p>}
    </section>
  );
}
