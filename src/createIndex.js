import { connect, close } from './db.js';

async function run() {
  const db = await connect();
  const collection = db.collection('molecules');

  await collection.createIndex({ indexBits: 1 });

  await close();
}

run();
