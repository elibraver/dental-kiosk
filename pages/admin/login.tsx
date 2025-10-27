import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';

const AdminLoginPage: NextPage = () => {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!pin) return setError('Ingresa tu PIN');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data: { ok?: boolean; error?: string } = await res.json();
      if (data.ok) router.push('/admin/panel');
      else setError(data.error ?? 'Error desconocido');
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        background: '#f5f5f5',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px 50px',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: 20, color: '#0ea5e9' }}>Acceso Recepción</h1>
        <input
          type="password"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{
            padding: '10px 15px',
            fontSize: 18,
            borderRadius: 8,
            border: '1px solid #ccc',
            width: '100%',
            marginBottom: 15,
            textAlign: 'center',
          }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 25px',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {error && <p style={{ color: 'red', marginTop: 15 }}>{error}</p>}
      </div>
    </div>
  );
};

export default AdminLoginPage;
