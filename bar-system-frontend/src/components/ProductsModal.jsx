import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, RefreshCw, Minus, Plus, ShoppingCart, Send } from 'lucide-react';
import { fetchProducts } from '../services/api';
import { getTableLabel } from '../utils/tables';
import { formatPrice } from '../utils/format';

// Colores neón del menú, asignados por turno a cada categoría
const CATEGORY_COLORS = [
  'var(--neon-yellow)',
  'var(--neon-green)',
  'var(--neon-cyan)',
  'var(--neon-pink)',
  'var(--neon-orange)',
  'var(--neon-purple)',
  'var(--neon-blue)',
];

const normalize = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function ProductsModal({ table, onClose, onSubmit }) {
  const [products, setProducts] = useState([]);
  // Pedido en preparación: { [nombre]: { nombre, precio, cantidad } }
  const [cart, setCart] = useState({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message || 'No se pudieron cargar los productos'))
      .finally(() => setLoading(false));
  }, []);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const changeQuantity = (product, delta) => {
    setCart((prev) => {
      const cantidad = (prev[product.nombre]?.cantidad || 0) + delta;
      const next = { ...prev };
      if (cantidad <= 0) delete next[product.nombre];
      else next[product.nombre] = { nombre: product.nombre, precio: product.precio, cantidad };
      return next;
    });
  };

  // Si hay productos sin enviar se pide confirmación antes de cerrar
  const handleClose = () => {
    if (sending) return;
    if (cartCount > 0 && !window.confirm('Hay productos sin enviar. ¿Cerrar y descartar el pedido?')) return;
    onClose();
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setSendError(null);
      await onSubmit(cartItems.map((item) => ({ producto: item.nombre, cantidad: item.cantidad })));
    } catch (err) {
      setSendError(err.message || 'No se pudo enviar el pedido');
      setSending(false);
    }
  };

  // Cerrar con Escape (se registra en cada render para usar el carrito actual)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && handleClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Categorías en el orden del option set de Dataverse (igual que el menú)
  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.categoria, p.categoriaNombre || 'Sin categoría'));
    return [...map.entries()]
      .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
      .map(([code, name], i) => ({ code, name, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [products]);

  const sections = useMemo(() => {
    const term = normalize(search.trim());
    return categories
      .filter((c) => category === null || c.code === category)
      .map((c) => ({
        ...c,
        items: products
          .filter((p) => p.categoria === c.code && normalize(p.nombre).includes(term))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, products, search, category]);

  const chipStyle = (active, color) => ({
    padding: '6px 12px',
    borderRadius: '9999px',
    border: `1.5px solid ${active ? color : 'var(--bg-card-border)'}`,
    backgroundColor: active ? 'var(--bg-card)' : 'transparent',
    color: active ? color : 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    boxShadow: active ? `0 0 10px ${color}` : 'none',
  });

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(7, 6, 26, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Productos"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: 'min(88vh, 900px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--bg-card-border)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(162, 57, 255, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--bg-card-border)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '30px',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '0.04em',
                background: 'var(--rainbow)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PRODUCTOS
            </h2>
            {table && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Pedido para {getTableLabel(table.id)}
              </p>
            )}
          </div>

          <label
            style={{
              flex: 1,
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid var(--bg-card-border)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid var(--bg-card-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Filtro por categoría */}
        {categories.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 20px',
              overflowX: 'auto',
              borderBottom: '1px solid var(--bg-card-border)',
            }}
          >
            <button type="button" onClick={() => setCategory(null)} style={chipStyle(category === null, 'var(--text-primary)')}>
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.code ?? 'none'}
                type="button"
                onClick={() => setCategory(c.code)}
                style={chipStyle(category === c.code, c.color)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="products-layout">
        {/* Productos */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 20px 24px' }}>
          {loading ? (
            <Message>
              <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando productos…
            </Message>
          ) : error ? (
            <Message color="#fca5a5">{error}</Message>
          ) : sections.length === 0 ? (
            <Message>No hay productos que coincidan con la búsqueda</Message>
          ) : (
            sections.map((section) => (
              <section key={section.code ?? 'none'} style={{ marginTop: '18px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '24px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: section.color,
                    textShadow: `0 0 12px ${section.color}`,
                    marginBottom: '10px',
                  }}
                >
                  {section.name}
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {section.items.map((product) => {
                    const inCart = cart[product.nombre]?.cantidad || 0;
                    return (
                    <button
                      type="button"
                      key={product.id}
                      className="product-card"
                      onClick={() => changeQuantity(product, 1)}
                      title="Añadir al pedido"
                      style={{
                        position: 'relative',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        minHeight: '84px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: `1px solid ${inCart ? section.color : 'var(--bg-card-border)'}`,
                        borderLeft: `3px solid ${section.color}`,
                        backgroundColor: 'var(--bg-card)',
                      }}
                    >
                      {inCart > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            minWidth: '24px',
                            height: '24px',
                            padding: '0 6px',
                            borderRadius: '9999px',
                            backgroundColor: section.color,
                            color: '#07061a',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 10px ${section.color}`,
                          }}
                        >
                          {inCart}
                        </span>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {product.nombre}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--price)' }}>
                        {formatPrice(product.precio)}
                      </span>
                    </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Pedido en preparación */}
        <aside className="products-cart">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--bg-card-border)' }}>
            <ShoppingCart size={17} color="var(--neon-yellow)" />
            <span style={{ fontWeight: 800, fontSize: '14px' }}>Nuevo pedido</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {cartCount} {cartCount === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px' }}>
            {cartItems.length === 0 ? (
              <p style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                Toca los productos para añadirlos
              </p>
            ) : (
              cartItems.map((item) => (
                <div key={item.nombre} style={{ padding: '10px 0', borderBottom: '1px dashed var(--bg-card-border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{item.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <button type="button" style={qtyButtonStyle} onClick={() => changeQuantity(item, -1)} aria-label="Quitar uno">
                      <Minus size={13} />
                    </button>
                    <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800 }}>{item.cantidad}</span>
                    <button type="button" style={qtyButtonStyle} onClick={() => changeQuantity(item, 1)} aria-label="Añadir uno">
                      <Plus size={13} />
                    </button>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--price)', fontSize: '13px' }}>
                      {formatPrice(item.precio * item.cantidad)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--bg-card-border)', backgroundColor: 'var(--bg-card)' }}>
            {sendError && <p style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px' }}>{sendError}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--price)' }}>{formatPrice(cartTotal)}</span>
            </div>
            <button
              type="button"
              disabled={cartCount === 0 || sending}
              onClick={handleSend}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(90deg, var(--neon-pink), var(--neon-orange))',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: cartCount === 0 || sending ? 'not-allowed' : 'pointer',
                opacity: cartCount === 0 || sending ? 0.45 : 1,
                boxShadow: cartCount === 0 ? 'none' : '0 0 16px rgba(255, 46, 151, 0.45)',
              }}
            >
              {sending ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              {sending ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </div>
        </aside>
        </div>
      </div>

      <style>{`
        .products-layout {
          flex: 1;
          min-height: 0;
          display: flex;
        }
        .products-cart {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--bg-card-border);
          background-color: var(--bg-primary);
        }
        @media (max-width: 760px) {
          .products-layout {
            flex-direction: column;
          }
          .products-cart {
            width: 100%;
            max-height: 45%;
            border-left: none;
            border-top: 1px solid var(--bg-card-border);
          }
        }
      `}</style>
    </div>
  );
}

const qtyButtonStyle = {
  width: '26px',
  height: '26px',
  borderRadius: '8px',
  border: '1px solid var(--bg-card-border)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

function Message({ children, color = 'var(--text-muted)' }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontSize: '14px',
        color,
      }}
    >
      {children}
    </div>
  );
}
