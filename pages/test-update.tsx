import { useState } from 'react';

export default function TestUpdate() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/rooms/1/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: 'Dr. Kably',
          doctorColor: '#0ea5e9',
          assistantName: 'Ana López',
          patientName: 'Pedro',
          type: 'tratamiento',
          tooth: '14',
          scheduledAt: new Date().toISOString(),
          recordNumber: 'EXP-2025-001',
        }),
      });

      const data: { ok?: boolean; error?: string } = await res.json();
      if (data.ok) setMessage('✅ Registro actualizado correctamente');
      else setMessage('❌ Error: ' + (data.error ?? 'desconocido'));
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      setMessage('⚠️ Error inesperado: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Prueba de actualización</h1>
      <button
        onClick={handleUpdate}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        {loading ? 'Actualizando...' : 'Enviar datos'}
      </button>
      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
