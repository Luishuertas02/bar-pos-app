import React, { useEffect, useState } from 'react';
import { Receipt, ClipboardList, RefreshCw } from 'lucide-react';
import ProductsModal from './ProductsModal';
import { fetchTableOrder, createTableRequest } from '../services/api';
import { getTableLabel, isOccupied } from '../utils/tables';
import { formatPrice, formatTime } from '../utils/format';

// Cuenta de la mesa seleccionada: su orden abierta, agrupada por pedido (R_001, R_002, ...)
export default function OrderPanel({ table, canOrder = true }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProducts, setShowProducts] = useState(false);

  const occupied = table ? isOccupied(table) : false;

  // Se vuelve a pedir la orden al cambiar de mesa o cuando la mesa se ocupa / libera
  useEffect(() => {
    setOrder(null);
    setError(null);
    if (!table || !occupied || !canOrder) return;

    let cancelled = false;
    setLoading(true);
    fetchTableOrder(table.id)
      .then((data) => !cancelled && setOrder(data))
      .catch((err) => !cancelled && setError(err.message || 'No se pudo cargar la cuenta'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [table?.id, occupied, canOrder]);

  const handleSubmitRequest = async (productos) => {
    const updated = await createTableRequest(table.id, productos);
    setOrder(updated);
    setShowProducts(false);
  };

  // Detalles agrupados por número de pedido, en el orden en que se hicieron
  const requests = [];
  (order?.detalles || []).forEach((detail) => {
    let group = requests.find((r) => r.numero === detail.numeroRequest);
    if (!group) {
      group = { numero: detail.numeroRequest, hora: detail.creadoEn, items: [] };
      requests.push(group);
    }
    group.items.push(detail);
  });

  const canTakeOrder = Boolean(table && occupied && canOrder && order);
  const buttonTitle = !table
    ? 'Selecciona una mesa primero'
    : !canOrder
      ? 'Tomar pedidos requiere conexión con el backend'
      : !occupied
        ? 'Ocupa la mesa para abrir una orden'
        : 'Abrir productos para tomar el pedido';

  let body;
  if (!table) {
    body = <EmptyState text="Selecciona una mesa para ver lo que ha pedido" />;
  } else if (!canOrder) {
    body = <EmptyState text="La cuenta requiere conexión con el backend" />;
  } else if (!occupied) {
    body = <EmptyState text="La mesa está libre. Ocúpala para abrir una orden" />;
  } else if (loading) {
    body = (
      <EmptyState
        text={
          <>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando cuenta…
          </>
        }
      />
    );
  } else if (error) {
    body = <EmptyState text={error} color="#fca5a5" />;
  } else if (!order) {
    body = <EmptyState text="Esta mesa no tiene una orden abierta" />;
  } else if (requests.length === 0) {
    body = <EmptyState text="Esta mesa todavía no tiene pedidos" />;
  } else {
    body = requests.map((request) => (
      <div key={request.numero} style={{ marginTop: '10px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--neon-cyan)',
            letterSpacing: '0.06em',
          }}
        >
          <span>PEDIDO {request.numero}</span>
          <span style={{ color: 'var(--text-muted)' }}>{formatTime(request.hora)}</span>
        </div>
        <ul style={{ listStyle: 'none' }}>
          {request.items.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '8px 0',
                borderBottom: '1px dashed var(--bg-card-border)',
                fontSize: '14px',
              }}
            >
              <span>
                <strong style={{ color: 'var(--text-secondary)' }}>{item.cantidad}×</strong> {item.producto}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--price)', whiteSpace: 'nowrap' }}>
                {formatPrice(item.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ));
  }

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
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 800 }}>
            Cuenta {table ? `· ${getTableLabel(table.id)}` : ''}
          </h2>
          {order && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Orden {order.numeroOrden} • {order.estadoNombre}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!canTakeOrder}
          onClick={() => setShowProducts(true)}
          title={buttonTitle}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--neon-yellow)',
            backgroundColor: 'rgba(255, 214, 10, 0.12)',
            color: 'var(--neon-yellow)',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: canTakeOrder ? 'pointer' : 'not-allowed',
            opacity: canTakeOrder ? 1 : 0.4,
          }}
        >
          <ClipboardList size={15} /> Tomar pedido
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 12px' }}>{body}</div>

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
          Total {order ? `• ${order.numeroProductos} productos` : ''}
        </span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--price)' }}>{formatPrice(order?.total)}</span>
      </footer>

      {showProducts && (
        <ProductsModal table={table} onClose={() => setShowProducts(false)} onSubmit={handleSubmitRequest} />
      )}
    </section>
  );
}

function EmptyState({ text, color = 'var(--text-muted)' }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        textAlign: 'center',
        fontSize: '13px',
        color,
      }}
    >
      {text}
    </div>
  );
}
