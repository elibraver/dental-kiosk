import { MongoClient } from 'mongodb';

// 📦 URI desde .env.local
const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error('❌ Falta MONGODB_URI en .env.local');

// 🔁 Conexión global reutilizable (evita múltiples conexiones en dev)
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

/**
 * Devuelve la base de datos especificada en la URI (p. ej. "dental-kiosk")
 */
export async function getDb() {
  const c = await clientPromise;
  return c.db();
}
