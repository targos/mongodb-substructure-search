import { createReadStream } from 'fs'
import { createGunzip } from 'zlib'

import mongodb from 'mongodb';

async function run() {
  const mongo = await mongodb.connect('mongodb://localhost:27017', {
    useNewUrlParser: true
  });
  const db = mongo.db('sss');
  const collection = db.collection('molecules');
  await collection.insertOne({
    test: 123
  });
}

run();
