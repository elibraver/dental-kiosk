// lib/models.ts

export type AppointmentType =
  | 'Primera Vez'
  | 'Emergencia'
  | 'En Tratamiento'
  | 'Otro Diente';

export type Doctor = {
  _id?: string;
  name: string;
  color: string; // hex
  active?: boolean;
};

export type Assistant = {
  _id?: string;
  name: string;
  active?: boolean;
};

export type Patient = {
  _id?: string;
  name: string; // se muestra solo el nombre
};

export type RoomPayload = {
  doctorId?: string;
  doctorName: string;
  doctorColor: string;

  assistantId?: string;
  assistantName?: string;

  patientId?: string;
  patientName?: string;

  recordNumber?: string;           // se guarda por asignación (no catálogo)
  type?: AppointmentType;          // menú desplegable
  tooth?: string;                  // texto libre
  scheduledAt?: string;            // ISO
};

export type RoomStateDoc = {
  roomId: number;                  // 1..5
  payload: RoomPayload | null;     // snapshot actual del cubículo
  updatedAt: string;               // ISO
};
