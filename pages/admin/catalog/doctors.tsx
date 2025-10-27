import { useEffect, useState } from 'react';

type Doctor = {
  _id?: string;
  name: string;
  color: string;
  active?: boolean;
};

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#0099ff');

  async function load() {
    const res = await fetch('/api/catalog/doctors');
    const data = await res.json();
    if (data.ok) setItems(data.items);
  }

  useEffect(() => {
    // Llamamos a load() dentro de una función async separada
    const fetchData = async () => {
      await load();
    };
    void fetchData();
  }, []);
  

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body: Doctor = editing
      ? { ...editing, name, color }
      : { name, color };

    const res = await fetch('/api/catalog/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      alert(editing ? '✅ Doctor actualizado' : '✅ Doctor agregado');
      setEditing(null);
      setName('');
      setColor('#0099ff');
      load();
    } else {
      alert('❌ Error al guardar');
    }
  }

  function startEdit(doc: Doctor) {
    setEditing(doc);
    setName(doc.name);
    setColor(doc.color);
  }

  async function handleDelete(id?: string, name?: string) {
    if (!id) return;
    const confirmed = confirm(`¿Eliminar al doctor ${name}?`);
    if (!confirmed) return;

    const res = await fetch(`/api/catalog/doctors?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      alert('✅ Eliminado correctamente');
      load();
    } else {
      alert('❌ Error al eliminar');
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>🩺 Catálogo de Doctores</h1>

      <form
        onSubmit={handleSave}
        style={{
          background: '#fafafa',
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          display: 'grid',
          gap: 12,
        }}
      >
        <input
          type="text"
          placeholder="Nombre del doctor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <code>{color}</code>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: editing ? '#ffaa00' : '#0070f3',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {loading
            ? 'Guardando...'
            : editing
            ? 'Actualizar Doctor'
            : 'Agregar Doctor'}
        </button>

        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setName('');
              setColor('#0099ff');
            }}
            style={{
              background: '#ddd',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((d) => (
          <div
            key={d._id}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 12,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              display: 'grid',
              gridTemplateColumns: '1fr 120px 160px',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {d._id}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                title={d.color}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: d.color,
                  border: '1px solid #ccc',
                }}
              />
              <code style={{ fontSize: 12 }}>{d.color}</code>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => startEdit(d)}
                style={{
                  border: '1px solid #ddd',
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Editar
              </button>

              <button
                onClick={() => handleDelete(d._id, d.name)}
                style={{
                  border: '1px solid #f00',
                  background: '#fee',
                  color: '#900',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
