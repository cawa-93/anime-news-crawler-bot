import {sendNotification}    from './bot.js';
import {config}              from 'dotenv';
import {join}                from 'node:path';
import {loadAnime}           from './shiki-api/loadAnime.js';
import {loadTopics}          from './shiki-api/topicsUpdates.js';
import {readFile, writeFile} from 'node:fs/promises';
import {readFileSync}        from 'node:fs';


config();
const LAST_CHECK_TIME_PATH = join(process.cwd(), 'meta/LAST_CHECK_TIME');
// 1628514378637
const LAST_CHECK_TIME = parseInt(readFileSync(LAST_CHECK_TIME_PATH, {encoding: 'utf-8'}));


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
 * @type {Map<string, Set<number>>|null}
 */
let franchises = null;


/**
 *
 * @param {ResolvedTopic[]} updates
 */
async function processUpdates(updates) {
	if (franchises === null) {
		franchises = await loadFranchisesFromMeta();
	}

	const allRelevantIds = new Set;
	franchises.forEach(idsSet => idsSet.forEach(id => allRelevantIds.add(id)));

	/**
	 * @param {ResolvedTopic} update
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

		await sendNotification(update);
	}
}


const currentCheckTime = Date.now();
loadTopics(LAST_CHECK_TIME, 'news')
	.then(processUpdates)
	.then(() => loadTopics(LAST_CHECK_TIME, 'updates'))
	.then(processUpdates)
	.then(() => writeFile(LAST_CHECK_TIME_PATH, `${currentCheckTime}`, {encoding: 'utf-8'}))
	.catch(e => {
		console.error(e);
		console.error(e.stack);
	});

