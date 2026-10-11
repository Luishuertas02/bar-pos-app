import React, { useState, useEffect } from 'react';
import FloorPlan from './components/FloorPlan';
import TableStatusPanel from './components/TableStatusPanel';
import OrderPanel from './components/OrderPanel';
import Logo from './components/Logo';
import { fetchTables, updateTableStatus, updateTablePeople, associateTables, dissociateTable } from './services/api';
import { isOccupied, getLeaderId, getGroupMembers, canBeAssociated, sortById } from './utils/tables';
import { RefreshCw, Users, Wifi, WifiOff } from 'lucide-react';

// Mesas iniciales o de respaldo en caso de que el backend no tenga registros aún
const DEFAULT_TABLES = [
  ...['Me1', 'Me2', 'Me3', 'Me4', 'Me5', 'Me6', 'Me7', 'Me8', 'Me9'].map((id) => ({
    id,
    capacidad: 4,
    personas: 0,
    estado: 962000000,
    estadoNombre: 'Disponible',
  })),
  ...['Ba1', 'Ba2', 'Ba3', 'Ba4'].map((id) => ({
    id,
    capacidad: 1,
    personas: 0,
    estado: 962000000,
    estadoNombre: 'Disponible',
  })),
];

export default function App() {
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Modo "asociar mesas": mesas elegidas en el plano para unir a la seleccionada
  const [associating, setAssociating] = useState(false);
  const [pendingIds, setPendingIds] = useState([]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await fetchTables();

      if (Array.isArray(data) && data.length > 0) {
        setTables(data);
        setIsConnected(true);
      } else {
        // Si el backend responde pero la lista está vacía, mantenemos las mesas por defecto
        setTables(DEFAULT_TABLES);
        setIsConnected(true);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Backend no disponible, usando datos locales:', err.message);
      setIsConnected(false);
      // Mantenemos las mesas actuales para permitir interacción en el plano
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleUpdateStatus = async (tableId, newStatusCode) => {
    if (isConnected) {
      await updateTableStatus(tableId, newStatusCode);
      await loadTables();
    } else {
      // Si estamos en modo desconectado/demo, actualizamos el estado localmente
      const statusNames = {
        962000000: 'Disponible',
        962000001: 'Ocupada',
      };

      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                estado: newStatusCode,
                estadoNombre: statusNames[newStatusCode] || 'Actualizada',
                personas: newStatusCode === 962000000 ? 0 : t.personas,
              }
            : t
        )
      );
    }
  };

  const handleUpdatePeople = async (tableId, peopleNumber) => {
    if (isConnected) {
      await updateTablePeople(tableId, peopleNumber);
      await loadTables();
    } else {
      // Modo desconectado: misma regla que el backend (>= 1 persona => Ocupada)
      const occupied = peopleNumber >= 1;
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                personas: peopleNumber,
                estado: occupied ? 962000001 : 962000000,
                estadoNombre: occupied ? 'Ocupada' : 'Disponible',
              }
            : t
        )
      );
    }
  };

  // Derivada de `tables` para que refleje el estado tras cada recarga
  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedGroup = selectedTable ? getGroupMembers(tables, selectedTable.id).sort(sortById) : [];
  const selectedIds = selectedGroup.map((t) => t.id);

  const stopAssociating = () => {
    setAssociating(false);
    setPendingIds([]);
  };

  const handleSelectTable = (table) => {
    if (associating) {
      // Mientras se asocia, tocar una mesa libre la añade o la quita de la selección
      if (selectedIds.includes(table.id) || !canBeAssociated(table)) return;
      setPendingIds((prev) =>
        prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]
      );
      return;
    }
    // Al tocar cualquier mesa de un grupo se selecciona su mesa principal
    setSelectedTableId(getLeaderId(table));
  };

  const handleConfirmAssociate = async () => {
    await associateTables(selectedTable.id, pendingIds);
    stopAssociating();
    await loadTables();
  };

  const handleDissociate = async (memberId) => {
    await dissociateTable(selectedTable.id, memberId);
    await loadTables();
  };

  // Contadores de estado
  const occupiedCount = tables.filter(isOccupied).length;
  const availableCount = tables.length - occupiedCount;
  // Gente en el local ahora mismo (solo cuentan las mesas ocupadas)
  const peopleCount = tables.filter(isOccupied).reduce((sum, t) => sum + (t.personas || 0), 0);

  return (
    <div className="app-layout">
      {/* Columna izquierda: Plano 2D */}
      <main className="app-floor">
        <FloorPlan
          tables={tables}
          onSelectTable={handleSelectTable}
          selectedIds={selectedIds}
          pendingIds={pendingIds}
          previewIds={associating ? [...selectedIds, ...pendingIds] : []}
        />
      </main>

      {/* Columna derecha: logo, estado, cambio de estado y cuenta */}
      <aside className="app-sidebar">
        <Logo />

        {/* Estado del backend y mesas disponibles */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--bg-card-border)',
            fontSize: '13px',
            fontWeight: 600,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: isConnected ? 'rgba(140, 242, 60, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isConnected ? '#8cf23c' : '#f87171',
              border: `1px solid ${isConnected ? 'rgba(140, 242, 60, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
            title={isConnected ? 'Conectado a http://localhost:5089' : 'Backend no detectado'}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Backend Online' : 'Modo Local / Offline'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-available)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-available)' }} />
            <span>{availableCount} Libres</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-occupied)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-occupied)' }} />
            <span>{occupiedCount} Ocupadas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-cyan)' }}>
            <Users size={14} />
            <span>{peopleCount} {peopleCount === 1 ? 'Persona' : 'Personas'}</span>
          </div>

          <button
            onClick={loadTables}
            disabled={loading}
            title={lastUpdated ? `Última actualización: ${lastUpdated}` : 'Refrescar'}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--bg-card-border)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Cambiar estado de la mesa */}
        <TableStatusPanel
          // Se reinicia al cambiar de mesa, de personas o de tamaño del grupo para mostrar datos frescos
          key={`${selectedTable?.id}-${selectedTable?.personas}-${selectedGroup.length}`}
          table={selectedTable}
          group={selectedGroup}
          associating={associating}
          pendingIds={pendingIds}
          canAssociate={isConnected}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePeople={handleUpdatePeople}
          onStartAssociate={() => setAssociating(true)}
          onCancelAssociate={stopAssociating}
          onConfirmAssociate={handleConfirmAssociate}
          onDissociate={handleDissociate}
        />

        {/* Cuenta de la mesa */}
        <OrderPanel table={selectedTable} canOrder={isConnected} />
      </aside>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .table-wrapper:hover {
          transform: translateY(-4px) scale(1.04);
        }
        .product-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
        }
        .app-layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(340px, 4fr) minmax(0, 6fr);
          gap: 32px;
          padding: 28px 32px;
        }
        .app-floor {
          display: flex;
          position: sticky;
          top: 28px;
          height: calc(100vh - 56px);
        }
        .app-sidebar {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        @media (max-width: 900px) {
          .app-layout {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 20px;
          }
          .app-floor {
            position: static;
            height: 85vh;
          }
        }
      `}</style>
    </div>
  );
}
