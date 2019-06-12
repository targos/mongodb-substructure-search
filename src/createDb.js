import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';

import OCL from 'openchemlib';
import sdfParser from 'sdf-parser';
import mongodb from 'mongodb';

import { bitCount } from './bitCount.js';

const molecules = sdfParser.stream.molecules;

async function run() {
  const mongo = await mongodb.connect('mongodb://localhost:27017', {
    useNewUrlParser: true
  });
  const db = mongo.db('sss');
  const collection = db.collection('molecules');

  const stream = createReadStream('data/ChEBI_complete.sdf.gz')
    .pipe(createGunzip())
    .pipe(molecules());

  for await (const molecule of stream) {
    const mol = OCL.Molecule.fromMolfile(molecule.molfile);
    const index = mol.getIndex();
    const bits = index.reduce((total, num) => total + bitCount(num), 0);

    const entry = {
      chebiId: molecule['ChEBI ID'],
      chebiName: molecule['ChEBI Name'],
      mf: molecule['Formulae'],
      index: index.slice(),
      indexBits: bits,
      ocl: mol.getIDCodeAndCoordinates()
    };

    await collection.insertOne(entry);
  }

  await mongo.close();
}

run();
