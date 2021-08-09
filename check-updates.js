import {config}      from 'dotenv';
import {join}        from 'node:path';
import {loadAnime}   from './shiki-api/loadAnime.js';
import {loadUpdates} from './shiki-api/topicsUpdates.js';
import {readFile}    from 'node:fs/promises';


config();

const LAST_CHECK_TIME = 1628360000000;


/**
 *
 * @return {Promise<Map<string, Set<number>>>}
 */
function loadFranchisesFromMeta() {
	const dest = join(process.cwd(), 'meta/franchises.json');
	return readFile(dest, {encoding: 'utf-8'}).then(s => {
		/** @type Map<string, Set<number>> */
		const map = new Map;

		const data = JSON.parse(s);

		for (const [franchiseName, ids] of data) {
			map.set(franchiseName, new Set(ids));
		}

		return map;
	});
}


/**
 *
 * @param {Topic} update
 */
function sendUpdateNotification(update) {
	console.log({update});
}


/**
 *
 * @param {Topic[]} updates
 * @param {Map<string, Set<number>>} franchises
 */
async function processUpdates(updates, franchises) {

	const allRelevantIds = new Set;
	franchises.forEach(idsSet => idsSet.forEach(id => allRelevantIds.add(id)));

	/**
	 * @param {Topic} update
	 */
	const isUpdateRelevant = async (update) => {
		if (allRelevantIds.has(update.linked.id)) {
			return true;
		}

		const anime = await loadAnime(update.linked.id);
		return anime.franchise !== null && franchises.has(anime.franchise);
	};

	for (const update of updates) {
		if (!await isUpdateRelevant(update)) {
			continue;
		}

		await sendUpdateNotification(update);
	}
}


Promise.all([
	loadUpdates(LAST_CHECK_TIME),
	loadFranchisesFromMeta(),
]).then(
	([updates, franchises]) => processUpdates(updates, franchises),
)
	.catch(console.error);
