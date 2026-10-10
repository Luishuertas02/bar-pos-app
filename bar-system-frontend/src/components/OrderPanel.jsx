import React from 'react';
import { Receipt } from 'lucide-react';
import { getTableLabel } from '../utils/tables';

const formatPrice = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

// Cuenta de la mesa seleccionada. `items` llegará del backend cuando exista el endpoint de pedidos.
export default function OrderPanel({ table, items = [] }) {
  const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  return (
    <section
      style={{
        flex: 1,
        minHeight: '260px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--bg-card-border)',
        }}
      >
        <Receipt size={18} color="var(--neon-pink)" />
        <h2 style={{ fontSize: '15px', fontWeight: 800 }}>
          Cuenta {table ? `· ${getTableLabel(table.id)}` : ''}
        </h2>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px' }}>
        {!table ? (
          <EmptyState text="Selecciona una mesa para ver lo que ha pedido" />
        ) : items.length === 0 ? (
          <EmptyState text="Esta mesa todavía no tiene pedidos" />
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {items.map((item, i) => (
              <li
                key={item.id ?? i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px dashed var(--bg-card-border)',
                  fontSize: '14px',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{item.cantidad}×</strong> {item.nombre}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--price)' }}>{formatPrice(item.precio * item.cantidad)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderTop: '1px solid var(--bg-card-border)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Total
        </span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--price)' }}>{formatPrice(total)}</span>
      </footer>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}
    >
      {text}
    </div>
  );
}
