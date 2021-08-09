import {config}         from 'dotenv';
import {join}           from 'node:path';
import {loadFranchises} from './shiki-api/loadFranchises.js';
import {writeFile}      from 'node:fs/promises';


const dest = join(process.cwd(), 'meta/franchises.json');

config();

const ignoredFranchises = (process.env.IGNORED_FRANCHISES || '').split(',').map(s => s.trim());

loadFranchises().then(franchises => {
	const dataToSave = [];
	for (const [franchise, ids] of franchises.entries()) {
		if (ignoredFranchises.includes(franchise)) {
			continue;
		}

		dataToSave.push([franchise, Array.from(ids.values())]);
	}
	return writeFile(dest, JSON.stringify(dataToSave), {flag: 'w'});
});
