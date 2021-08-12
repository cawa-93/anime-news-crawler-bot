import {loadUserRates}    from './shiki-api/loadUserRates.js';
import {loadFranchise}    from './shiki-api/loadFranchises.js';
import {sendNotification} from './bot.js';
import {config}           from 'dotenv';
import {join}             from 'node:path';
import {loadAnime}        from './shiki-api/loadAnime.js';
import {loadTopics}       from './shiki-api/topicsUpdates.js';
import {writeFile}        from 'node:fs/promises';
import {readFileSync}     from 'node:fs';


config();
const LAST_CHECK_TIME_PATH = join(process.cwd(), 'meta/LAST_CHECK_TIME');
// 1628514378637
const LAST_CHECK_TIME = parseInt(readFileSync(LAST_CHECK_TIME_PATH, {encoding: 'utf-8'}));

/**
 *
 * @type {Promise<Set<number>>}
 */
const relevantIdsPromise = loadUserRates().then(rates => {
	const relevantIds = new Set;
	rates.forEach(rate => relevantIds.add(rate.target_id));
	return relevantIds;
});
const ignoredFranchises = new Set((process.env.IGNORED_FRANCHISES || '').split(',').map(s => s.trim()));


/**
 *
 * @param body
 * @return {Set<number>}
 */
function getIdsFromText(body) {
	if (typeof body !== 'string' || !body.includes('/animes/')) {
		return new Set;
	}

	const ids = new Set;

	for (const [, idStr] of body.matchAll(/\/animes\/[a-z]?(?<id>[0-9]+)/ig)) {
		const id = parseInt(idStr, 10);
		if (isNaN(id)) {
			continue;
		}
		ids.add(id);
	}

	return ids;
}


/**
 * @param {ResolvedTopic} update
 */
async function isUpdateRelevant(update) {
	const relevantIds = await relevantIdsPromise;

	// Если к новости нет прикреплённых аниме
	// Выполнить поиск по тексту новости
	if (!update?.linked?.id) {
		const ids = getIdsFromText(update.body);
		for (const id of ids) {
			if (relevantIds.has(id)) {
				return true;
			}
		}

		return false;
	}

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
 * @param {number} id
 * @return {Promise<TopicLinked>}
 */
function createLinked(id) {
	return loadAnime(id);
}


/**
 *
 * @param {ResolvedTopic[]} updates
 */
async function processUpdates(updates) {
	console.log(`Загружено ${updates.length} новостей`);
	for (const update of updates) {
		if (await isUpdateRelevant(update)) {

			if (!update.linked) {
				const linkedIds = getIdsFromText(update.body);
				update.linked = await createLinked(linkedIds.values().next().value);
			}

			console.log(`Отпрака уведомления "${update.title}"`);
			await sendNotification(update);
		} else {
			console.log(`Не релевантно "${update.title}"`);
		}
	}
}


const currentCheckTime = Date.now();
loadTopics(LAST_CHECK_TIME, 'updates')
	.then(processUpdates)
	.then(() => loadTopics(LAST_CHECK_TIME, 'news'))
	.then(processUpdates)
	.then(() => writeFile(LAST_CHECK_TIME_PATH, `${currentCheckTime}`, {encoding: 'utf-8'}))
	.catch(e => {
		console.error(e);
		console.error(e.stack);
	});

