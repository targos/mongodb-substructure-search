import OCL from 'openchemlib';
import mongodb from 'mongodb';

import config from '../config.json';

import { connect, close } from './db.js';
import { indexBitCount, bitsOn } from './bitCount.js';

const query = process.argv[2];
const mode = process.argv.includes('--array') ? 'array' : 'bin';

if (!query) {
  console.error(
    'usage: node --experimental-modules src/search.js <query smiles>'
  );
  process.exit(1);
}

async function run() {
  const db = await connect();
  const collection = db.collection('molecules');

  const queryMol = OCL.Molecule.fromSmiles(query);

  const index = queryMol.getIndex().slice();
  const indexBits = indexBitCount(index);

  queryMol.setFragment(true);
  const searcher = new OCL.SSSearcher();
  searcher.setFragment(queryMol);

  const count = await collection.count({});
  console.log('total count', count);

  console.log('index bits set', indexBits);

  const countWithBits = await collection.count({
    indexBits: { $gte: indexBits }
  });
  console.log('count with index bits', countWithBits);

  const filter = {
    indexBits: { $gte: indexBits }
  };

  if (mode === 'array') {
    for (let i = 0; i < 16; i++) {
      filter[`index.${i}`] = { $bitsAllSet: bitsOn(index[i]) };
    }
  } else {
    const indexTyped = Uint32Array.from(index);
    const indexBuffer = Buffer.from(indexTyped.buffer);
    filter.indexBin = { $bitsAllSet: new mongodb.Binary(indexBuffer) };
  }

  console.log('index', index);
  console.log('filter', filter);

  console.time('count with bitwise');
  const countWithBitwise = await collection.count(filter);
  console.timeEnd('count with bitwise');
  console.log('count with bitwise', countWithBitwise);

  const max = 1000;
  console.time(`find max ${max}`);
  const cursor = await collection.find(filter);
  let found = [];
  let checked = 0;
  for await (const value of cursor) {
    checked++;
    const molecule = OCL.Molecule.fromIDCode(value.ocl.idCode, false);
    searcher.setMolecule(molecule);
    if (searcher.isFragmentInMolecule()) {
      found.push(value);
    }
    if (found.length === max) {
      break;
    }
  }
  console.timeEnd(`find max ${max}`);

  console.log(`checked ${checked} molecules`);

  if (found.length === max) {
    console.log(`found at least ${max} matching molecules`);
    printMatches(found);
  } else {
    console.log(`found ${found.length} matching molecules`);
    printMatches(found);
  }

  await close();
}

function printMatches(molecules) {
  for (const molecule of molecules.slice(0, 10)) {
    if (config.type === 'chebi') {
      console.log(`${molecule.id} / ${molecule.name} (${molecule.mf})`);
    } else if (config.type === 'chembl') {
      console.log(`${molecule.id} (${molecule.mf})`);
    } else {
      throw new Error(`unknown database: ${config.type}`);
    }
  }
}

run();
