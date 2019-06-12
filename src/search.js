import OCL from 'openchemlib';

import { connect, close } from './db.js';
import { indexBitCount, bitsOn } from './bitCount.js';

const query = process.argv[2];

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
  for (let i = 0; i < 16; i++) {
    filter[`index.${i}`] = { $bitsAllSet: bitsOn(index[i]) };
  }

  console.log('index', index);
  console.log('filter', filter);

  console.time('count with bitwise');
  const countWithBitwise = await collection.count(filter);
  console.timeEnd('count with bitwise');
  console.log('count with bitwise', countWithBitwise);

  console.time('find max 10');
  const cursor = await collection.find(filter).sort({ mw: 1 });
  let found = [];
  let checked = 0;
  for await (const value of cursor) {
    checked++;
    const molecule = OCL.Molecule.fromIDCode(value.ocl.idCode);
    searcher.setMolecule(molecule);
    if (searcher.isFragmentInMolecule()) {
      found.push(value);
      if (found.length === 25) {
        break;
      }
    }
  }
  console.timeEnd('find max 10');

  console.log(`checked ${checked} molecules`);

  if (found.length === 10) {
    console.log('10 first matching molecules');
    printMatches(found);
  } else {
    console.log(`found ${found.length} matching molecules`);
    printMatches(found);
  }

  await close();
}

function printMatches(molecules) {
  for (const molecule of molecules) {
    console.log(`${molecule.chebiId} / ${molecule.chebiName} (${molecule.mf})`);
  }
}

run();
