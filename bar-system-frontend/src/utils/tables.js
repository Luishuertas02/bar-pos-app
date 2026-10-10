// Ubicación de cada mesa en el plano según su cra58_tablenumber de Dataverse.
// x / y son el centro del elemento en % del ancho / alto del local.
export const TABLE_LAYOUT = {
  Me4: { x: 72, y: 7 },
  Me5: { x: 84, y: 21 },
  Me6: { x: 84, y: 32 },
  Me7: { x: 84, y: 43 },
  Me8: { x: 84, y: 54 },
  Me9: { x: 84, y: 65 },
  Me3: { x: 17, y: 40 },
  Me2: { x: 17, y: 53 },
  Me1: { x: 17, y: 66 },
  Ba1: { x: 67, y: 77 },
  Ba2: { x: 67, y: 83 },
  Ba3: { x: 67, y: 89 },
  Ba4: { x: 67, y: 95 },
};

export const isBarSeat = (id = '') => id.toLowerCase().startsWith('ba');

// "Me3" -> "Mesa 3", "Ba2" -> "Barra 2"
export function getTableLabel(id = '') {
  const number = id.replace(/\D/g, '');
  if (isBarSeat(id)) return `Barra ${number}`;
  if (id.toLowerCase().startsWith('me')) return `Mesa ${number}`;
  return id;
}

export const isOccupied = (table) =>
  (table.estadoNombre || '').toLowerCase().includes('ocupad') || table.estado === 962000001;

// Mesas asociadas: todas guardan en `grupo` el id de la mesa principal
export const getLeaderId = (table) => table.grupo || table.id;

export function getGroupMembers(tables, leaderId) {
  const members = tables.filter((t) => t.grupo === leaderId);
  return members.length > 0 ? members : tables.filter((t) => t.id === leaderId);
}

// Solo se pueden unir mesas libres que no pertenezcan ya a otro grupo
export const canBeAssociated = (table) => !table.grupo && !isOccupied(table);

export const sortById = (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true });

export function getStatusInfo(status, statusText) {
  if (isOccupied({ estado: status, estadoNombre: statusText })) {
    return {
      label: statusText || 'Ocupada',
      color: 'var(--status-occupied)',
      bg: 'var(--status-occupied-bg)',
      border: 'rgba(255, 46, 151, 0.6)',
      glow: '0 0 14px rgba(255, 46, 151, 0.45)',
    };
  }

  return {
    label: statusText || 'Disponible',
    color: 'var(--status-available)',
    bg: 'var(--status-available-bg)',
    border: 'rgba(140, 242, 60, 0.6)',
    glow: '0 0 14px rgba(140, 242, 60, 0.45)',
  };
}
