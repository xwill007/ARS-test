/**
 * showLogs - Función para mostrar logs de manera inteligente
 * @param {any} variable - Variable a mostrar
 * @param {string} label - Etiqueta opcional para identificar el log
 * @param {boolean} enabled - Si está habilitado el logging (por defecto true)
 */
const showLogs = (variable, label = '', enabled = true) => {
  if (!enabled) return;

  const timestamp = new Date().toLocaleTimeString();
  const prefix = label ? `[${label}] ` : '';
  
  // Verificar si la variable es texto (string)
  if (typeof variable === 'string') {
    console.log(`${timestamp} ${prefix}${variable}`);
  } else {
    // Para otros tipos de datos, usar console.table, console.dir o console.log según el tipo
    console.log(`${timestamp} ${prefix}Type: ${typeof variable}`);
    
    if (variable === null) {
      console.log(`${timestamp} ${prefix}Value: null`);
    } else if (variable === undefined) {
      console.log(`${timestamp} ${prefix}Value: undefined`);
    } else if (Array.isArray(variable)) {
      console.log(`${timestamp} ${prefix}Array length: ${variable.length}`);
      console.table(variable);
    } else if (typeof variable === 'object') {
      // Para objetos complejos como Vector3, etc.
      if (variable.constructor && variable.constructor.name) {
        console.log(`${timestamp} ${prefix}Object type: ${variable.constructor.name}`);
      }
      
      // Verificar si es un objeto Three.js con toArray()
      if (typeof variable.toArray === 'function') {
        console.log(`${timestamp} ${prefix}Value (array):`, variable.toArray());
      } else if (typeof variable.toString === 'function' && variable.toString !== Object.prototype.toString) {
        console.log(`${timestamp} ${prefix}Value (string):`, variable.toString());
      } else {
        console.dir(variable);
      }
    } else {
      // Para números, booleans, etc.
      console.log(`${timestamp} ${prefix}Value:`, variable);
    }
  }
};

/**
 * showLogsCmd - Función específica para mostrar en línea de comandos (CMD)
 * @param {any} variable - Variable a mostrar
 * @param {string} label - Etiqueta opcional
 */
const showLogsCmd = (variable, label = '') => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = label ? `[${label}] ` : '';
  
  // Crear mensaje para CMD
  let message = `${timestamp} ${prefix}`;
  
  if (typeof variable === 'string') {
    message += variable;
  } else if (typeof variable === 'object' && variable !== null) {
    message += `Object: ${JSON.stringify(variable, null, 2)}`;
  } else {
    message += `Value: ${variable} (${typeof variable})`;
  }
  
  // Mostrar en consola del navegador (que actúa como CMD en el contexto web)
  console.info(`%c[CMD] ${message}`, 'background: #000; color: #0f0; font-family: monospace;');
};

/**
 * logConfig - Configuración global de logs
 */
const logConfig = {
  enabled: true,
  showTimestamp: true,
  showType: true,
  maxArrayLength: 10,
  environment: 'development' // 'development' | 'production'
};

/**
 * setLogConfig - Configurar opciones de logging
 * @param {object} config - Nueva configuración
 */
const setLogConfig = (config) => {
  Object.assign(logConfig, config);
};

/**
 * conditionalLog - Log condicional basado en el entorno
 * @param {any} variable - Variable a mostrar
 * @param {string} label - Etiqueta
 * @param {string} level - Nivel de log ('info', 'warn', 'error', 'debug')
 */
const conditionalLog = (variable, label = '', level = 'info') => {
  if (!logConfig.enabled || logConfig.environment === 'production') return;
  
  const timestamp = logConfig.showTimestamp ? `[${new Date().toLocaleTimeString()}] ` : '';
  const prefix = label ? `[${label}] ` : '';
  const typeInfo = logConfig.showType ? ` (${typeof variable})` : '';
  
  const message = `${timestamp}${prefix}${typeof variable === 'string' ? variable : JSON.stringify(variable)}${typeInfo}`;
  
  switch (level) {
    case 'warn':
      console.warn(message);
      break;
    case 'error':
      console.error(message);
      break;
    case 'debug':
      console.debug(message);
      break;
    default:
      console.info(message);
  }
};

export { showLogs, showLogsCmd, setLogConfig, conditionalLog };
export default showLogs;