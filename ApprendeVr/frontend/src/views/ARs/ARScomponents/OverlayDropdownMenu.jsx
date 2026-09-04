import React, { useState, useMemo } from 'react';
import overlayRegistry from './overlays/index';
import { useVRLanguage } from '../../../components/VRConfig/VRLanguageContext';
import './OverlayDropdownMenu.css';

/**
 * Menú desplegable de overlays con checkboxes y configuración
 */
const OverlayDropdownMenu = ({
  selectedOverlays = [],
  onOverlayToggle,
  onClearAll,
  onResetToDefaults,
  onConfigureOverlay,
  multiSelect = true,
  isOpen = false,
  onToggleOpen
}) => {
  const [menuSize, setMenuSize] = useState({ width: 350, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const { t } = useVRLanguage();

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
    console.log('🔄 Smooth overlay toggle:', overlayKey);
    if (onOverlayToggle) {
      onOverlayToggle(overlayKey);
    }
    // Mantener el menú abierto para selecciones fluidas múltiples
    // El overlay se actualiza automáticamente sin resetear la vista
  };

  const isSelected = (overlayKey) => {
    return selectedOverlays.includes(overlayKey);
  };

  const toggleMenu = () => {
    if (onToggleOpen) {
      onToggleOpen();
    }
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  const handleResetToDefaults = () => {
    if (onResetToDefaults) {
      onResetToDefaults();
    }
  };

  // Funciones para el redimensionamiento
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width: menuSize.width, height: menuSize.height });
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    
    // Límites más estrictos para mejor UX
    const minWidth = 280;
    const maxWidth = 450;
    const minHeight = 200;
    const maxHeight = 800;
  
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
    
    setMenuSize({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Event listeners para el redimensionamiento
  React.useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      const handleGlobalMouseUp = () => handleMouseUp();
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, startPos, startSize]);

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
    width: `${menuSize.width}px`,
    height: `${menuSize.height}px`,
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid #007acc',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    padding: '8px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    resize: 'none', // Deshabilitamos el resize nativo
    overflow: 'hidden',
    boxShadow: isResizing ? '0 0 20px rgba(0, 122, 204, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
    transition: isResizing ? 'none' : 'all 0.2s ease'
  };

  const overlayItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease', // Transición suave para cambios
    fontSize: '13px',
    position: 'relative'
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

  const actionButtonStyle = {
    width: '100%',
    padding: '6px',
    color: 'white',
    border: '1px solid #007acc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    marginTop: '4px',
    transition: 'all 0.2s ease',
    background: 'rgba(0, 122, 204, 0.2)'
  };

  const scrollContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    marginBottom: '8px',
    paddingRight: '4px',
    // Estilos personalizados para el scrollbar
    scrollbarWidth: 'thin',
    scrollbarColor: '#007acc rgba(255, 255, 255, 0.1)'
  };

  const resizeHandleStyle = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '20px',
    height: '20px',
    cursor: 'se-resize',
    background: isResizing ? 'rgba(0, 122, 204, 0.7)' : 'rgba(0, 122, 204, 0.3)',
    borderRadius: '8px 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#007acc',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    transform: isResizing ? 'scale(1.2)' : 'scale(1)'
  };

  const sizeIndicatorStyle = {
    position: 'absolute',
    bottom: '25px',
    right: '5px',
    padding: '2px 6px',
    background: 'rgba(0, 122, 204, 0.9)',
    color: 'white',
    fontSize: '10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    pointerEvents: 'none',
    opacity: isResizing ? 1 : 0,
    transition: 'opacity 0.2s ease'
  };

  const getTypeColor = (type) => {
    return type === 'r3f' ? '#00ff00' : '#ff6600';
  };

  const getTypeIcon = (type) => {
    return type === 'r3f' ? '🟢' : '🔴';
  };

  const handleConfigureOverlay = (overlayKey, event) => {
    event.stopPropagation();
    if (onConfigureOverlay) {
      onConfigureOverlay(overlayKey);
    }
  };

  const isConfigurable = (overlayKey) => {
    // Verificar si el overlay tiene la propiedad configurable en su registro
    const overlayConfig = overlayRegistry.get(overlayKey);
    return overlayConfig?.configurable === true;
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
          {t('overlays.title')}
          {selectedCount > 0 && (
            <span className="overlay-count-badge" style={badgeStyle}>{selectedCount}</span>
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
        <div 
          style={dropdownStyle}
          className={`overlay-dropdown ${isResizing ? 'resizing' : ''}`}
        >
          {/* Header del menú */}
          <div style={{ 
            padding: '8px 0', 
            borderBottom: '1px solid #333', 
            marginBottom: '8px',
            fontSize: '12px',
            color: '#ccc'
          }}>
            {multiSelect ? t('overlays.selectMultiple') : t('overlays.selectOne')}
          </div>

          {/* Contenedor con scroll para la lista de overlays */}
          <div 
            style={scrollContainerStyle}
            className="overlay-dropdown-scroll"
          >
            {overlayList.map(({ key, label, type, description, category }) => {
              const selected = isSelected(key);
              return (
                <div
                  key={key}
                  className={`overlay-item-smooth ${selected ? 'overlay-item-selected' : ''}`}
                  style={{
                    ...overlayItemStyle,
                    background: selected ? 'rgba(0, 122, 204, 0.3)' : 'transparent',
                    borderLeft: selected ? '3px solid #00ff00' : '3px solid transparent',
                    transform: selected ? 'translateX(2px)' : 'translateX(0px)'
                  }}
                  onClick={() => handleOverlayChange(key)}
                  onMouseOver={(e) => {
                    if (!selected) {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!selected) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0px)';
                    }
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleOverlayChange(key)}
                    className="overlay-checkbox"
                    style={checkboxStyle}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Información del overlay */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: getTypeColor(type) }}>
                        {getTypeIcon(type)}
                      </span>
                      <strong style={{ color: 'white' }}>{t(label)}</strong>
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
                      {t(description)}
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
                  </div>                {/* Indicador de selección */}
                {selected && (
                  <span style={{ color: '#00ff00', fontSize: '14px' }}>
                    ✓
                  </span>
                )}

                {/* Botón de configuración */}
                {isConfigurable(key) && (
                  <button
                    onClick={(e) => handleConfigureOverlay(key, e)}
                    style={{
                      background: 'rgba(0, 122, 204, 0.3)',
                      border: '1px solid #007acc',
                      borderRadius: '4px',
                      color: '#007acc',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 6px',
                      marginLeft: '5px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(0, 122, 204, 0.5)';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(0, 122, 204, 0.3)';
                      e.target.style.color = '#007acc';
                    }}
                    title={t('overlays.configure')}
                  >
                    ⚙️
                  </button>
                )}
                </div>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
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
                {t('overlays.cleanAll').replace('{count}', selectedCount)}
              </button>
            )}

            {/* Botón resetear a defaults */}
            <button
              style={actionButtonStyle}
              onClick={handleResetToDefaults}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 152, 0, 0.3)';
                e.target.style.borderColor = '#ff9800';
                e.target.style.color = '#ffcc80';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(0, 122, 204, 0.2)';
                e.target.style.borderColor = '#007acc';
                e.target.style.color = 'white';
              }}
              title={t('overlays.resetHint')}
            >
              {t('overlays.resetDefaults')}
            </button>
          </div>

          {/* Footer con estadísticas */}
          <div style={{ 
            padding: '8px 0', 
            borderTop: '1px solid #333', 
            marginTop: '8px',
            fontSize: '10px',
            color: '#888',
            textAlign: 'center'
          }}>
            {t('overlays.footer').replace('{total}', overlayList.length).replace('{active}', selectedCount)}
          </div>

          {/* Handle de redimensionamiento */}
          <div
            style={resizeHandleStyle}
            className="resize-handle"
            onMouseDown={handleMouseDown}
            onMouseOver={(e) => {
              if (!isResizing) {
                e.target.style.background = 'rgba(0, 122, 204, 0.5)';
                e.target.style.transform = 'scale(1.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!isResizing) {
                e.target.style.background = 'rgba(0, 122, 204, 0.3)';
                e.target.style.transform = 'scale(1)';
              }
            }}
            title={t('overlays.dragResize')}
          >
            ◢
          </div>

          {/* Indicador de tamaño durante redimensionamiento */}
          <div style={sizeIndicatorStyle}>
            {Math.round(menuSize.width)}×{Math.round(menuSize.height)}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayDropdownMenu;
