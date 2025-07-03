import React, { useState, useMemo } from 'react';
import overlayRegistry from './overlays/index';

/**
 * Menú desplegable de overlays con checkboxes
 */
const OverlayDropdownMenu = ({ 
  selectedOverlays = [], 
  onOverlayToggle,
  onClearAll,
  multiSelect = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Obtener overlays dinámicamente del registro
  const overlayList = useMemo(() => {
    const allOverlays = overlayRegistry.getAll();
    return Object.entries(allOverlays).map(([key, config]) => ({
      key,
      label: config.label,
      type: config.type,
      description: config.description,
      category: config.category
    }));
  }, []);

  const selectedCount = selectedOverlays.length;

  const handleOverlayChange = (overlayKey) => {
    if (onOverlayToggle) {
      onOverlayToggle(overlayKey);
    }
  };

  const isSelected = (overlayKey) => {
    return selectedOverlays.includes(overlayKey);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  // Estilos del componente
  const menuButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    border: '2px solid #007acc',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    userSelect: 'none',
    minWidth: '140px',
    justifyContent: 'space-between'
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid #007acc',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    padding: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000
  };

  const overlayItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    fontSize: '13px'
  };

  const checkboxStyle = {
    width: '16px',
    height: '16px',
    accentColor: '#007acc'
  };

  const badgeStyle = {
    background: '#007acc',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold'
  };

  const clearButtonStyle = {
    width: '100%',
    padding: '8px',
    background: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '8px',
    transition: 'background 0.2s ease'
  };

  const getTypeColor = (type) => {
    return type === 'r3f' ? '#00ff00' : '#ff6600';
  };

  const getTypeIcon = (type) => {
    return type === 'r3f' ? '🟢' : '🔴';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botón principal del menú */}
      <div
        style={menuButtonStyle}
        onClick={toggleMenu}
        onMouseOver={(e) => {
          e.target.style.background = 'rgba(0, 122, 204, 0.2)';
          e.target.style.transform = 'scale(1.02)';
        }}
        onMouseOut={(e) => {
          e.target.style.background = 'rgba(0, 0, 0, 0.8)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        <span>
          📋 OVERLAYS
          {selectedCount > 0 && (
            <span style={badgeStyle}>{selectedCount}</span>
          )}
        </span>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s ease' 
        }}>
          ▼
        </span>
      </div>

      {/* Menú desplegable */}
      {isOpen && (
        <div style={dropdownStyle}>
          {/* Header del menú */}
          <div style={{ 
            padding: '8px 0', 
            borderBottom: '1px solid #333', 
            marginBottom: '8px',
            fontSize: '12px',
            color: '#ccc'
          }}>
            {multiSelect ? 'Selecciona múltiples overlays' : 'Selecciona un overlay'}
          </div>

          {/* Lista de overlays */}
          {overlayList.map(({ key, label, type, description, category }) => {
            const selected = isSelected(key);
            return (
              <div
                key={key}
                style={{
                  ...overlayItemStyle,
                  background: selected ? 'rgba(0, 122, 204, 0.2)' : 'transparent'
                }}
                onClick={() => handleOverlayChange(key)}
                onMouseOver={(e) => {
                  if (!selected) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!selected) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => handleOverlayChange(key)}
                  style={checkboxStyle}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Información del overlay */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: getTypeColor(type) }}>
                      {getTypeIcon(type)}
                    </span>
                    <strong style={{ color: 'white' }}>{label}</strong>
                    <span style={{ 
                      fontSize: '8px', 
                      color: '#999',
                      textTransform: 'uppercase',
                      background: 'rgba(255,255,255,0.1)',
                      padding: '2px 4px',
                      borderRadius: '2px'
                    }}>
                      {type}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#bbb', 
                    marginTop: '2px',
                    lineHeight: '1.2'
                  }}>
                    {description}
                  </div>
                  {category && (
                    <div style={{ 
                      fontSize: '9px', 
                      color: '#888', 
                      marginTop: '2px',
                      fontStyle: 'italic'
                    }}>
                      📁 {category}
                    </div>
                  )}
                </div>

                {/* Indicador de selección */}
                {selected && (
                  <span style={{ color: '#00ff00', fontSize: '14px' }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}

          {/* Botón limpiar todo */}
          {selectedCount > 0 && (
            <button
              style={clearButtonStyle}
              onClick={handleClearAll}
              onMouseOver={(e) => {
                e.target.style.background = '#cc0000';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#ff4444';
              }}
            >
              🗑️ Limpiar todo ({selectedCount})
            </button>
          )}

          {/* Footer con estadísticas */}
          <div style={{ 
            padding: '8px 0', 
            borderTop: '1px solid #333', 
            marginTop: '8px',
            fontSize: '10px',
            color: '#888',
            textAlign: 'center'
          }}>
            {overlayList.length} overlays disponibles • {selectedCount} activos
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayDropdownMenu;
