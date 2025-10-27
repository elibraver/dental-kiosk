import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

type Payload = {
  doctorName: string;
  doctorColor: string; // hex
  assistantName?: string;
  patientName?: string;   // solo nombre por privacidad
  recordNumber?: string;  // número de expediente
  type?:
    | 'primera_vez'
    | 'emergencia'
    | 'tratamiento'
    | 'Primera Vez'
    | 'Emergencia'
    | 'En Tratamiento'
    | 'Otro Diente';
  tooth?: string;
  scheduledAt?: string;   // ISO
};

type ApiResp = {
  ok: boolean;
  roomId: number;
  payload: Payload | null;
  updatedAt: string | null;
};

function dentroHorarioLaboral(date = new Date()) {
  const h = date.getHours();
  return h >= 9 && h < 20; // 9:00 a 19:59
}

function mmss(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type TimerKey = 't7' | 't17';
const DURATIONS: Record<TimerKey, number> = {
  t7: 7 * 60 * 1000,
  t17: 17 * 60 * 1000,
};

type TimerState = {
  running: boolean;
  targetAt: number | null;
  remainingMs: number;
};

// Helper para obtener AudioContext sin usar "any"
function createAudioContext(): AudioContext | null {
  const w = window as unknown as {
    webkitAudioContext?: typeof AudioContext;
    AudioContext?: typeof AudioContext;
  };
  const Ctor = window.AudioContext || w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export default function Kiosk() {
  const router = useRouter();
  const roomId = Number(router.query.roomId);

  const [data, setData] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NO llamar Date.now() en render (regla purity)
  const lastHardRef = useRef<number>(0);
  useEffect(() => {
    lastHardRef.current = Date.now();
  }, []);

  // ====== Audio (WebAudio) para la alarma ======
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = createAudioContext();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // Hz
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 1200);
      if ('vibrate' in navigator) {
        // @ts-expect-error: algunos navegadores no tipan vibrate
        navigator.vibrate?.(400);
      }
    } catch {
      // sin audio
    }
  }, []);

  // ====== Fetch de datos ======
  const fetchNow = useCallback(async () => {
    if (!roomId || Number.isNaN(roomId)) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/current`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResp;
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [roomId]);

  // Primera carga (diferida para evitar "set-state-in-effect")
  useEffect(() => {
    const id = setTimeout(() => {
      void fetchNow();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchNow]);

  // Polling cada 60s solo en horario laboral
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => {
      if (dentroHorarioLaboral()) void fetchNow();
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [roomId, fetchNow]);

  // Hard refresh cada 5 minutos (comprobado cada 30s)
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastHardRef.current >= 5 * 60 * 1000) {
        lastHardRef.current = now;
        void fetchNow();
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [roomId, fetchNow]);

  // ====== Temporizadores (persistentes por cubículo) ======
  const [timers, setTimers] = useState<Record<TimerKey, TimerState>>({
    t7: { running: false, targetAt: null, remainingMs: DURATIONS.t7 },
    t17: { running: false, targetAt: null, remainingMs: DURATIONS.t17 },
  });

  // Cargar del localStorage (diferido para la regla "set-state-in-effect")
  useEffect(() => {
    if (!roomId) return;
    const id = setTimeout(() => {
      const raw = localStorage.getItem(`kiosk-timers-${roomId}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<TimerKey, TimerState>;
          setTimers(parsed);
        } catch {
          // ignore
        }
      }
    }, 0);
    return () => clearTimeout(id);
  }, [roomId]);

  // Guardar timers
  useEffect(() => {
    if (!roomId) return;
    localStorage.setItem(`kiosk-timers-${roomId}`, JSON.stringify(timers));
  }, [roomId, timers]);

  // Ticker de timers
  useEffect(() => {
    const id = setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next: Record<TimerKey, TimerState> = { ...prev };
        (Object.keys(prev) as TimerKey[]).forEach((k) => {
          const t = prev[k];
          if (!t.running || !t.targetAt) return;
          const remaining = Math.max(0, t.targetAt - Date.now());
          if (remaining !== t.remainingMs) {
            next[k] = { ...t, remainingMs: remaining };
            changed = true;
          }
          if (remaining <= 0) {
            beep();
            next[k] = { running: false, targetAt: null, remainingMs: DURATIONS[k] };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 200);
    return () => clearInterval(id);
  }, [beep]);

  function startTimer(key: TimerKey) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
      audioCtxRef.current?.resume?.();
    } catch {
      // ignore
    }
    setTimers((prev) => ({
      ...prev,
      [key]: { running: true, targetAt: Date.now() + DURATIONS[key], remainingMs: DURATIONS[key] },
    }));
  }
  function stopTimer(key: TimerKey) {
    setTimers((prev) => ({
      ...prev,
      [key]: { running: false, targetAt: null, remainingMs: DURATIONS[key] },
    }));
  }

  // ====== Render helpers ======
  const bg = data?.payload?.doctorColor || '#0ea5e9';
  const tipo = (() => {
    const t = data?.payload?.type;
    if (!t) return '—';
    if (t === 'primera_vez' || t === 'Primera Vez') return 'Primera Vez';
    if (t === 'emergencia' || t === 'Emergencia') return 'Emergencia';
    if (t === 'tratamiento' || t === 'En Tratamiento') return 'En Tratamiento';
    if (t === 'Otro Diente') return 'Otro Diente';
    return String(t);
  })();

  const hora = useMemo(() => {
    const s = data?.payload?.scheduledAt;
    if (!s) return '—';
    try {
      return new Date(s).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }, [data?.payload?.scheduledAt]);

  return (
    <>
      <Head>
        <title>{`Kiosco | Cubículo ${roomId || '—'}`}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>

      <div className="root" style={{ background: bg }}>
        <header className="topbar">
          <div className="room">Cubículo {roomId || '—'}</div>
          <div className="poll">
            Polling: 1 min {dentroHorarioLaboral() ? '(activo)' : '(fuera de horario)'} · Hard: 5 min
          </div>
        </header>

        <main className="content">
          {/* Tarjeta datos principales */}
          <section className="card">
            <div className="label">Doctor/a</div>
            <div className="value xl">{data?.payload?.doctorName ?? '—'}</div>

            <div className="sp" />

            <div className="label">Asistente</div>
            <div className="value xl">{data?.payload?.assistantName ?? '—'}</div>

            <div className="sp" />

            <div className="label">Paciente</div>
            <div className="value xl">{data?.payload?.patientName ?? '—'}</div>

            <div className="label mt8">Expediente</div>
            <div className="value lg">{data?.payload?.recordNumber ?? '—'}</div>
          </section>

          {/* Tarjeta detalles y hora */}
          <section className="card">
            <div className="label">Tipo de cita</div>
            <div className="value xl">{tipo}</div>

            <div className="sp" />

            <div className="label">Diente a tratar</div>
            <div className="value xl">{data?.payload?.tooth ?? '—'}</div>

            <div className="sp" />

            <div className="label">Hora</div>
            <div className="value xl">{hora}</div>
          </section>

          {/* Panel de temporizadores */}
          <section className="timers">
            {/* Timer 7 */}
            <div className="timerRow">
              <div>
                <div className="timerTitle">Temporizador 7:00</div>
                <div className="timerDigits">{mmss(timers.t7.remainingMs)}</div>
              </div>
              <div className="timerBtns">
                {!timers.t7.running ? (
                  <button className="btn" onClick={() => startTimer('t7')}>
                    Iniciar
                  </button>
                ) : (
                  <button className="btn danger" onClick={() => stopTimer('t7')}>
                    Detener
                  </button>
                )}
              </div>
            </div>

            {/* Timer 17 */}
            <div className="timerRow">
              <div>
                <div className="timerTitle">Temporizador 17:00</div>
                <div className="timerDigits">{mmss(timers.t17.remainingMs)}</div>
              </div>
              <div className="timerBtns">
                {!timers.t17.running ? (
                  <button className="btn" onClick={() => startTimer('t17')}>
                    Iniciar
                  </button>
                ) : (
                  <button className="btn danger" onClick={() => stopTimer('t17')}>
                    Detener
                  </button>
                )}
              </div>
            </div>

            <div className="hint">
              Tip: toca “Iniciar” una vez para habilitar el sonido en este dispositivo.
            </div>
          </section>
        </main>

        <footer className="footer">{error ? `Error: ${error}` : 'Kiosco Dental'}</footer>
      </div>

      <style jsx>{`
        .root {
          min-height: 100vh;
          color: #fff;
          display: flex;
          flex-direction: column;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
            env(safe-area-inset-bottom) env(safe-area-inset-left);
        }
        .topbar {
          position: sticky;
          top: 0;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          font-weight: 700;
          backdrop-filter: brightness(0.95);
        }
        .room {
          font-size: clamp(18px, 3.5vw, 28px);
        }
        .poll {
          font-size: clamp(12px, 2.2vw, 16px);
          opacity: 0.95;
        }

        .content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          padding: 16px;
        }

        @media (min-width: 900px), (orientation: landscape) {
          .content {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
          .timers {
            grid-column: 1 / -1;
          }
        }

        .card {
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          border-radius: 16px;
          padding: clamp(14px, 2.5vw, 20px);
          min-height: 180px;
          display: grid;
          grid-template-columns: 1fr;
          align-content: start;
          gap: 8px;
        }

        .label {
          opacity: 0.8;
          font-size: clamp(14px, 2.2vw, 18px);
        }
        .value {
          font-weight: 800;
        }
        .value.xl {
          font-size: clamp(24px, 4.5vw, 44px);
          line-height: 1.1;
          word-break: break-word;
        }
        .value.lg {
          font-size: clamp(20px, 3.6vw, 34px);
          word-break: break-word;
        }
        .mt8 {
          margin-top: 8px;
        }
        .sp {
          height: 8px;
        }

        .timers {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: clamp(12px, 2.5vw, 16px);
          display: grid;
          gap: 12px;
        }
        .timerRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.22);
          border-radius: 12px;
          padding: clamp(10px, 2.5vw, 14px);
        }
        .timerTitle {
          opacity: 0.95;
          margin-bottom: 6px;
          font-weight: 700;
          font-size: clamp(14px, 2.2vw, 18px);
        }
        .timerDigits {
          font-size: clamp(26px, 6vw, 52px);
          font-weight: 800;
          letter-spacing: 1px;
        }
        .timerBtns {
          display: flex;
          gap: 10px;
        }
        .btn {
          padding: clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 16px);
          border-radius: 12px;
          border: none;
          cursor: pointer;
          background: #ffffff;
          color: #0f172a;
          font-weight: 700;
          font-size: clamp(14px, 2.4vw, 16px);
        }
        .btn.danger {
          background: #ef4444;
          color: #fff;
        }
        .hint {
          grid-column: 1 / -1;
          font-size: clamp(11px, 2vw, 13px);
          opacity: 0.95;
        }

        .footer {
          text-align: center;
          padding: 10px 12px;
          opacity: 0.95;
          font-size: clamp(12px, 2.2vw, 14px);
        }
      `}</style>
    </>
  );
}
