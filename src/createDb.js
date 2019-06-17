import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';

import mongodb from 'mongodb';
import OCL from 'openchemlib';
import sdfParser from 'sdf-parser';

import config from '../config.json';
import { indexBitCount } from './bitCount.js';
import { connect, close } from './db.js';

const molecules = sdfParser.stream.molecules;

async function run() {
  const db = await connect();
  const collection = db.collection('molecules');

  const stream = createReadStream(`data/${config.file}`)
    .pipe(createGunzip())
    .pipe(molecules());

  let total = 0;

  for await (const molecule of stream) {
    const mol = OCL.Molecule.fromMolfile(molecule.molfile);
    const index = mol.getIndex();
    const bits = indexBitCount(index);

    const entry = {};

    if (config.type === 'chebi') {
      entry.id = molecule['ChEBI ID'];
      entry.name = molecule['ChEBI Name'];
    } else if (config.type === 'chembl') {
      entry.id = molecule.chembl_id;
    } else {
      throw new Error(`unknown database: ${config.type}`);
    }

    entry.index = index.slice();
    const indexTyped = Uint32Array.from(entry.index);
    const indexBuffer = Buffer.from(indexTyped.buffer);
    entry.indexBin = new mongodb.Binary(indexBuffer);
    entry.indexBits = bits;
    entry.ocl = mol.getIDCodeAndCoordinates();

    const mf = mol.getMolecularFormula();
    entry.mf = mf.formula;
    entry.mw = mf.relativeWeight;
    entry.em = mf.absoluteWeight;

    await collection.insertOne(entry);

    if (++total % 10000 === 0) {
      console.log(`imported ${total} structures`);
    }
  }

  await close();
}

run();
