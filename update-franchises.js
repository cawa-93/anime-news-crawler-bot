import {config}         from 'dotenv';
import {join}           from 'node:path'
import {loadFranchises} from './shiki-api/loadFranchises.js';
import {writeFile}      from 'node:fs/promises'
const dest = join(process.cwd(), 'meta/franchises.json')

config()

loadFranchises().then(franchises => {
	const dataToSave = []
	for (const [franchise, ids] of franchises.entries()) {
		dataToSave.push([franchise, Array.from(ids.values())])
	}
	return writeFile(dest, JSON.stringify(dataToSave), {flag: 'w'})
})
