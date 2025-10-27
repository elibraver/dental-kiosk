import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppointmentType } from '../../lib/models';

type Doctor = { _id: string; name: string; color: string };
type Assistant = { _id: string; name: string };
type Patient = { _id: string; name: string; recordNumber: string; defaultTooth?: string };

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Primera Vez',
  'Emergencia',
  'En Tratamiento',
  'Otro Diente',
];

export default function AdminPanelPage() {
  const router = useRouter();

  // ---- Protección de sesión ----
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const me = await fetch('/api/admin/me').then((r) => r.json());
      if (!me.isAdmin) router.push('/admin/login');
      else setIsAdmin(true);
    })();
  }, [router]);

  // ---- Catálogos ----
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [d, a, p] = await Promise.all([
        fetch('/api/catalog/doctors').then((r) => r.json()),
        fetch('/api/catalog/assistants').then((r) => r.json()),
        fetch('/api/catalog/patients').then((r) => r.json()),
      ]);
      if (d?.ok) setDoctors(d.items ?? []);
      if (a?.ok) setAssistants(a.items ?? []);
      if (p?.ok) setPatients(p.items ?? []);
    })();
  }, [isAdmin]);

  // ---- Formulario de asignación (snapshot por cubículo) ----
  const [roomId, setRoomId] = useState<number>(1);

  const [doctorId, setDoctorId] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');

  const [recordNumber, setRecordNumber] = useState<string>(''); // editable
  const [tooth, setTooth] = useState<string>('');               // editable
  const [apptType, setApptType] = useState<AppointmentType>('Primera Vez');
  const [scheduledAt, setScheduledAt] = useState<string>('');   // HH:MM

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d._id === doctorId),
    [doctors, doctorId]
  );
  const selectedAssistant = useMemo(
    () => assistants.find((a) => a._id === assistantId),
    [assistants, assistantId]
  );
  const selectedPatient = useMemo(
    () => patients.find((p) => p._id === patientId),
    [patients, patientId]
  );

  // Cuando cambia el paciente: prellenar expediente y diente (pero mantenlos editables)
  useEffect(() => {
    if (!selectedPatient) return;
    setRecordNumber(selectedPatient.recordNumber ?? '');
    setTooth(selectedPatient.defaultTooth ?? '');
  }, [selectedPatient]);

  // ---- Enviar ----
  const [message, setMessage] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  async function handleSubmit() {
    setMessage('');
    if (!selectedDoctor) return setMessage('Selecciona un doctor');
    // assistant y patient pueden ser opcionales según tu operación diaria, pero recomendamos elegirlos.
    const payload = {
      doctorName: selectedDoctor.name,
      doctorColor: selectedDoctor.color,      // 🔒 se toma del catálogo, no editable
      assistantName: selectedAssistant?.name ?? '',
      patientName: selectedPatient?.name ?? '',
      recordNumber: recordNumber,             // editable
      type: apptType,
      tooth: tooth,                           // editable
      scheduledAt: scheduledAt,               // 'HH:MM' → backend normaliza
    };

    try {
      setSaving(true);
      const res = await fetch(`/api/rooms/${roomId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) setMessage('✅ Asignación guardada correctamente');
      else setMessage('❌ Error: ' + (data.error ?? 'No se pudo guardar'));
    } catch (e) {
      setMessage('❌ Error de red');
    } finally {
      setSaving(false);
    }
  }

  const go = (path: string) => router.push(path);

  if (isAdmin === null) return <p style={{ padding: 40 }}>Verificando sesión…</p>;

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, color: '#0ea5e9' }}>Panel de Administración</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => go('/admin/catalog/doctors')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}
          >
            Doctores
          </button>
          <button
            onClick={() => go('/admin/catalog/assistants')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}
          >
            Asistentes
          </button>
          <button
            onClick={() => go('/admin/catalog/patients')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}
          >
            Pacientes
          </button>
        </div>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Si no encuentras un doctor, asistente o paciente en los selectores, usa las ligas para darlo de alta.
      </p>

      {/* Cubículo grande */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 8,
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontWeight: 800,
          color: '#0f172a',
        }}
      >
        Cubículo {roomId}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'end',
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Cubículo */}
        <label style={{ display: 'grid', gap: 6 }}>
          Número de cubículo
          <select
            value={roomId}
            onChange={(e) => setRoomId(Number(e.target.value))}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {/* Doctor */}
        <label style={{ display: 'grid', gap: 6 }}>
          Doctor/a
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            <option value="">Seleccionar…</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          {/* Color oculto (solo lectura visual opcional) */}
          {selectedDoctor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, opacity: 0.8 }}>
              <div
                title={selectedDoctor.color}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: selectedDoctor.color,
                  border: '1px solid #ccc',
                }}
              />
              <small>Color asignado del catálogo</small>
            </div>
          )}
        </label>

        {/* Asistente */}
        <label style={{ display: 'grid', gap: 6 }}>
          Asistente
          <select
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            <option value="">Seleccionar…</option>
            {assistants.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {/* Paciente */}
        <label style={{ display: 'grid', gap: 6 }}>
          Paciente
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            <option value="">Seleccionar…</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (Exp. {p.recordNumber})
              </option>
            ))}
          </select>
        </label>

        {/* Expediente (editable) */}
        <label style={{ display: 'grid', gap: 6 }}>
          Número de expediente
          <input
            type="text"
            value={recordNumber}
            onChange={(e) => setRecordNumber(e.target.value)}
            placeholder="Ej. EXP-2025-001"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>

        {/* Diente (editable) */}
        <label style={{ display: 'grid', gap: 6 }}>
          Diente a tratar
          <input
            type="text"
            value={tooth}
            onChange={(e) => setTooth(e.target.value)}
            placeholder="Ej. 14"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>

        {/* Tipo de cita */}
        <label style={{ display: 'grid', gap: 6 }}>
          Tipo de cita
          <select
            value={apptType}
            onChange={(e) => setApptType(e.target.value as AppointmentType)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {/* Hora (HH:MM → backend normaliza a ISO) */}
        <label style={{ display: 'grid', gap: 6 }}>
          Hora de cita
          <input
            type="time"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <small style={{ opacity: 0.7 }}>
            Se envía como <code>HH:MM</code> y se convierte a ISO automáticamente.
          </small>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={handleSubmit}
          disabled={saving || !doctorId}
          style={{
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            padding: '12px 18px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar en cubículo'}
        </button>

        <button
          onClick={() => router.push('/admin/login')}
          style={{
            background: '#999',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
