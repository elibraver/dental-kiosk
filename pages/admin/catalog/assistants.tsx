import { useEffect, useState } from 'react';

type Assistant = {
  _id?: string;
  name: string;
  active?: boolean;
};

export default function AssistantsPage() {
  const [items, setItems] = useState<Assistant[]>([]);
  const [editing, setEditing] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');

  async function load() {
    const res = await fetch('/api/catalog/assistants');
    const data = await res.json();
    if (data.ok) setItems(data.items);
  }

  useEffect(() => {
    const fetchData = async () => {
      await load();
    };
    void fetchData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body: Assistant = editing ? { ...editing, name } : { name };

    const res = await fetch('/api/catalog/assistants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      alert(editing ? '✅ Asistente actualizado' : '✅ Asistente agregado');
      setEditing(null);
      setName('');
      load();
    } else {
      alert('❌ Error al guardar');
    }
  }

  function startEdit(a: Assistant) {
    setEditing(a);
    setName(a.name);
  }

  async function handleDelete(id?: string, nombre?: string) {
    if (!id) return;
    const confirmed = confirm(`¿Eliminar al asistente ${nombre}?`);
    if (!confirmed) return;

    const res = await fetch(`/api/catalog/assistants?id=${id}`, { method: 'DELETE' });
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
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>👩‍⚕️ Catálogo de Asistentes</h1>

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
          placeholder="Nombre del asistente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        />

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
            ? 'Actualizar Asistente'
            : 'Agregar Asistente'}
        </button>

        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setName('');
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
        {items.map((a) => (
          <div
            key={a._id}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 12,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              display: 'grid',
              gridTemplateColumns: '1fr 160px',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {a._id}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => startEdit(a)}
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
                onClick={() => handleDelete(a._id, a.name)}
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
