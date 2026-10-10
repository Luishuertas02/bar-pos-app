const API_BASE_URL = 'http://localhost:5089/api/tables';

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
