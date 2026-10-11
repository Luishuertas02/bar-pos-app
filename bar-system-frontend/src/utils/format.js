const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const formatPrice = (value) => priceFormatter.format(value || 0);

export const formatTime = (isoDate) =>
  isoDate ? new Date(isoDate).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
