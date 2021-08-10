import {config}         from 'dotenv';
import {join}           from 'node:path';
import {loadUserRates}  from './shiki-api/loadUserRates.js';
import {writeFile}      from 'node:fs/promises';


const dest = join(process.cwd(), 'meta/franchises.json');

config();

loadUserRates({user_id: process.env.SHIKI_USER_ID, type: ['Anime']})
	.then(rates => {
	const relevantIds = rates.map(r => r.target_id);
	return writeFile(dest, JSON.stringify(relevantIds), {flag: 'w'});
});
