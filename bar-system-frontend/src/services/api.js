const API_ROOT = 'http://localhost:5089/api';
const API_BASE_URL = `${API_ROOT}/tables`;
const PRODUCTS_URL = `${API_ROOT}/products`;

export async function fetchTables() {
  const response = await fetch(API_BASE_URL);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateTableStatus(tableId, newStatus) {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(tableId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newStatus),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: No se pudo actualizar el estado`);
  }

  return true;
}

// Guarda cuántas personas usan la mesa; el backend la marca Ocupada si son >= 1
export async function updateTablePeople(tableId, peopleNumber) {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(tableId)}/people`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(peopleNumber),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: No se pudo actualizar el número de personas`);
  }

  return await response.json();
}

// Asocia `tableIds` a la mesa principal `leaderId` (se tratan como una sola mesa)
export async function associateTables(leaderId, tableIds) {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(leaderId)}/group`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tableIds),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: No se pudieron asociar las mesas`);
  }

  return await response.json();
}

// Quita la mesa hija `memberId` del grupo de la mesa principal `leaderId`
export async function dissociateTable(leaderId, memberId) {
  const response = await fetch(
    `${API_BASE_URL}/${encodeURIComponent(leaderId)}/group/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: No se pudo desasociar la mesa`);
  }

  return true;
}

export async function fetchProducts() {
  const response = await fetch(PRODUCTS_URL);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// Orden abierta de la mesa (o de su grupo) con sus detalles; null si no tiene
export async function fetchTableOrder(tableId) {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(tableId)}/order`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// Registra un pedido (R_00x) con varios productos en la orden abierta de la mesa.
// productos: [{ producto: 'Águila', cantidad: 2 }, ...]. Devuelve la orden actualizada.
export async function createTableRequest(tableId, productos) {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(tableId)}/order/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productos }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: No se pudo registrar el pedido`);
  }

  return await response.json();
}
