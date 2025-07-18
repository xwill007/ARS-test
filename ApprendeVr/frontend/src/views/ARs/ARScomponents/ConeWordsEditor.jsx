import React, { useEffect, useState } from 'react';


const WORD_FILES = [
  'cone_words.json',
  'cone_words_gangsta.json'
];
const FONT_OPTIONS = [
  { value: 'Roboto-msdf', label: 'Roboto-msdf' },
  { value: 'Ultra-msdf', label: 'Ultra-msdf' },
  { value: 'test', label: 'Test MSDF' },
  { value: 'test2', label: 'Test2 MSDF' },
  { value: 'mozillavr', label: 'MozillaVR (bitmap)' },
  { value: 'dejavu', label: 'DejaVu (bitmap)' }
];

const ConeWordsEditor = ({ panelSpacing, setPanelSpacing }) => {
  const [wordFile, setWordFile] = useState(() => localStorage.getItem('cone_words_file') || 'cone_words.json');
  const [fontName, setFontName] = useState(() => localStorage.getItem('cone_words_font') || 'Roboto-msdf');
  const [words, setWords] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newWord, setNewWord] = useState({ es: '', en: '' });
  const [error, setError] = useState('');
  const [showList, setShowList] = useState(true);

  // Cargar palabras desde el archivo JSON o localStorage
  useEffect(() => {
    localStorage.setItem('cone_words_file', wordFile);
    localStorage.setItem('cone_words_font', fontName);
    const local = localStorage.getItem('cone_words_edit');
    if (local && local !== '[]') {
      try {
        const arr = JSON.parse(local);
        if (Array.isArray(arr) && arr.length > 0) {
          setWords(arr);
          return;
        }
      } catch {}
    }
    fetch(`/config/${wordFile}`)
      .then(res => res.json())
      .then(data => {
        setWords(data);
        localStorage.setItem('cone_words_edit', JSON.stringify(data));
      })
      .catch(() => setWords([]));
  }, [wordFile]);

  // Guardar palabras en localStorage (simulación de persistencia)
  const saveWords = (updated) => {
    localStorage.setItem('cone_words_edit', JSON.stringify(updated));
    setError('Guardado local (solo frontend, requiere backend para persistir en archivo)');
  };

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setNewWord(words[idx]);
    setShowList(true);
  };

  const handleDelete = (idx) => {
    if (window.confirm('¿Eliminar esta palabra?')) {
      const updated = words.filter((_, i) => i !== idx);
      setWords(updated);
      setEditingIndex(null);
      saveWords(updated);
    }
  };

  const handleSaveEdit = () => {
    if (!newWord.es.trim() || !newWord.en.trim()) {
      setError('Completa ambos campos');
      return;
    }
    const updated = [...words];
    updated[editingIndex] = { ...newWord };
    setWords(updated);
    setEditingIndex(null);
    setNewWord({ es: '', en: '' });
    setError('');
    saveWords(updated);
  };

  const handleAdd = () => {
    if (!newWord.es.trim() || !newWord.en.trim()) {
      setError('Completa ambos campos');
      return;
    }
    const updated = [...words, { ...newWord }];
    setWords(updated);
    setNewWord({ es: '', en: '' });
    setError('');
    saveWords(updated);
  };

  // Exportar palabras como JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cone_words.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar palabras como TXT
  const exportTXT = () => {
    const txt = words.map(w => `${w.es}\t${w.en}`).join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cone_words.txt';
    a.click();
    URL.revokeObjectURL(url);
  };


  // Sincronizar: primero local→JSON (descarga), luego JSON→local
  const syncWords = async () => {
    try {
      // 1. Fusionar localStorage + JSON base y descargar como JSON
      const res = await fetch(CONE_WORDS_PATH);
      if (!res.ok) throw new Error('No se pudo cargar el JSON base: ' + res.status);
      const jsonWords = await res.json();
      const local = localStorage.getItem('cone_words_edit');
      let localWords = [];
      try { localWords = JSON.parse(local) || []; } catch (e) { setError('Error leyendo localStorage: ' + e.message); return; }
      if (!Array.isArray(jsonWords)) throw new Error('El JSON base no es un array');
      const merged = [...localWords, ...jsonWords.filter(jw => !localWords.some(lw => lw.es === jw.es && lw.en === jw.en))];
      // Descargar como JSON
      try {
        const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cone_words_merged.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError('Error al descargar JSON: ' + e.message);
        return;
      }
      // 2. Actualizar localStorage con el JSON fusionado
      setWords(merged);
      saveWords(merged);
      setError('Sincronización completa: Local → JSON (descargado) y actualizado Local');
    } catch (e) {
      setError('Error al sincronizar: ' + (e.message || e));
    }
  };

  // Importar palabras desde archivo
  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let imported = [];
      try {
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(ev.target.result);
        } else if (file.name.endsWith('.txt')) {
          imported = ev.target.result.split(/\r?\n/).map(line => {
            const [es, en] = line.split(/\t|,/);
            return es && en ? { es: es.trim(), en: en.trim() } : null;
          }).filter(Boolean);
        }
        if (Array.isArray(imported) && imported.length > 0) {
          setWords(imported);
          saveWords(imported);
          setError('Lista importada correctamente');
        } else {
          setError('Archivo vacío o formato incorrecto');
        }
      } catch {
        setError('Error al importar archivo');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding: 10 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
        <label>
          Archivo:
          <select value={wordFile} onChange={e => setWordFile(e.target.value)} style={{ marginLeft: 6 }}>
            {WORD_FILES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label>
          Fuente:
          <select value={fontName} onChange={e => setFontName(e.target.value)} style={{ marginLeft: 6 }}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
      </div>
      <h4>Palabras del Cono</h4>
      <div style={{ marginBottom: 10 }}>
        <label>
          Separación entre paneles:
          <input
            type="number"
            min="0.01"
            max="1"
            step="0.01"
            value={panelSpacing}
            onChange={e => setPanelSpacing(parseFloat(e.target.value) || 0.01)}
            style={{ marginLeft: 6, width: 60 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Español"
          value={newWord.es}
          onChange={e => setNewWord({ ...newWord, es: e.target.value })}
        />
        <input
          placeholder="Inglés"
          value={newWord.en}
          onChange={e => setNewWord({ ...newWord, en: e.target.value })}
        />
        <button onClick={handleAdd}>Agregar</button>
        <button onClick={() => setShowList(v => !v)} style={{ marginLeft: 8 }}>
          {showList ? 'Ocultar lista' : 'Ver/Editar lista'}
        </button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <button onClick={exportJSON}>Exportar JSON</button>
        <button onClick={exportTXT} style={{ marginLeft: 8 }}>Exportar TXT</button>
        <label style={{ marginLeft: 16, cursor: 'pointer' }}>
          <span style={{ textDecoration: 'underline' }}>Importar</span>
          <input type="file" accept=".json,.txt" style={{ display: 'none' }} onChange={importFile} />
        </label>
        <button onClick={syncWords} style={{ marginLeft: 16, background: '#0af', color: 'white' }}>Sincronizar</button>
      </div>
      {error && <div style={{ color: 'orange', marginTop: 8 }}>{error}</div>}
      <div style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>
        * Los cambios solo se guardan en localStorage. Puedes exportar/importar la lista para editarla fuera de la app.
      </div>
      {showList && (
        <table style={{ width: '100%', background: '#222', color: 'white', borderRadius: 8, marginTop: 16 }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th>Español</th>
              <th>Inglés</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w, i) => (
              <tr key={i} style={{ background: i % 2 ? '#282828' : '#222' }}>
                <td>
                  {editingIndex === i ? (
                    <input value={newWord.es} onChange={e => setNewWord({ ...newWord, es: e.target.value })} />
                  ) : w.es}
                </td>
                <td>
                  {editingIndex === i ? (
                    <input value={newWord.en} onChange={e => setNewWord({ ...newWord, en: e.target.value })} />
                  ) : w.en}
                </td>
                <td>
                  {editingIndex === i ? (
                    <>
                      <button onClick={handleSaveEdit}>Guardar</button>
                      <button onClick={() => setEditingIndex(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(i)}>Editar</button>
                      <button onClick={() => handleDelete(i)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ConeWordsEditor;
