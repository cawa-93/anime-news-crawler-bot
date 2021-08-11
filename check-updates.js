import {loadUserRates}       from 'shiki-api/loadUserRates.js';
import {loadFranchise}       from './shiki-api/loadFranchises.js';
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
 * @deprecated
 * @return {Promise<Set<number>>}
 */
function loadFranchisesFromMeta() {
	const dest = join(process.cwd(), 'meta/franchises.json');
	return readFile(dest, {encoding: 'utf-8'}).then(s => new Set(JSON.parse(s || '[]')));
}


/**
 *
 * @type {Promise<Set<number>>}
 */
const relevantIdsPromise = loadUserRates().then(rates => {
	const relevantIds = new Set
	rates.forEach(rate => relevantIds.add(rate.target_id))
	return relevantIds
});
const ignoredFranchises = new Set((process.env.IGNORED_FRANCHISES || '').split(',').map(s => s.trim()));


/**
 * @param {ResolvedTopic} update
 */
async function isUpdateRelevant(update) {
	if (!update?.linked?.id) {
		return false;
	}

	const relevantIds = await relevantIdsPromise;

	const anime = await loadAnime(update.linked.id);

	if (anime.franchise && ignoredFranchises.has(anime.franchise)) {
		return false;
	}

	if (relevantIds.has(update.linked.id)) {
		return true;
	}

	const graph = await loadFranchise(update.linked.id);
	const isRelevantFranchise = graph.nodes.some(node => relevantIds.has(node.id));

	/**
	 * Если обнаружена релевантная франшиза -- скачать локально все ID
	 * Чтобы при следующих итерациях не пришлось загружать эту же франшизу повторно
	 */
	if (isRelevantFranchise) {
		graph.nodes.forEach(node => relevantIds.add(node.id));
		return true;
	}

	return false;
}


/**
 *
 * @param {ResolvedTopic[]} updates
 */
async function processUpdates(updates) {
	for (const update of updates) {
		if (await isUpdateRelevant(update)) {
			await sendNotification(update);
		}
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

