import mongodb from 'mongodb';

let mongo;

export async function connect() {
  mongo = await mongodb.connect('mongodb://localhost:27017', {
    useNewUrlParser: true
  });
  return mongo.db('sss');
}

export async function close() {
  return mongo.close();
}
