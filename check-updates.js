import {loadUserRates} from './shiki-api/loadUserRates.js';
import {loadFranchise} from './shiki-api/loadFranchises.js';
import {sendNotification} from './bot.js';
import {config} from 'dotenv';
import {join} from 'node:path';
import {loadAnime} from './shiki-api/loadAnime.js';
import {loadTopics} from './shiki-api/topicsUpdates.js';
import {writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';


config();
const LAST_CHECK_TIME_PATH = join(process.cwd(), 'meta/LAST_CHECK_TIME');
// 1628514378637
const LAST_CHECK_TIME = parseInt(readFileSync(LAST_CHECK_TIME_PATH, {encoding: 'utf-8'}));

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
 *
 * @type {Set<number> | null}
 */
let relevantIdsCache = null;


function getRelevantIds() {
    if (relevantIdsCache !== null) {
        return Promise.resolve(relevantIdsCache);
    }

    return loadUserRates().then(rates => {
        relevantIdsCache = new Set;
        rates.forEach(rate => relevantIdsCache.add(rate.target_id));
        return relevantIdsCache;
    });
}


/**
 * Проверяет является ли переданный Anime ID релевантным -- относится ли к одной из просмотренных фрашниз
 * @param {number} id
 */
async function isIdRelevant(id) {
    const relevantIds = await getRelevantIds();

    const anime = await loadAnime(id);

    if (anime.franchise && ignoredFranchises.has(anime.franchise)) {
        return false;
    }

    if (relevantIds.has(id)) {
        return true;
    }

    const graph = await loadFranchise(id);
    const isRelevantFranchise = graph.nodes.some(node => relevantIds.has(node.id));

    /**
     * Если обнаружена релевантная франшиза -- скачать локально все ID
     * Чтобы при следующих итерациях не пришлось загружать эту же франшизу повторно
     */
    if (isRelevantFranchise) {
        graph.nodes.forEach(node => relevantIdsCache.add(node.id));
    }

    return isRelevantFranchise;
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
    for (const update of updates) {


        /**
         * Если новость не прикреплена к какому-либо аниме
         * Нужно выполнить поиск ссылок на аниме тексте и привязать новость к релевантным
         * Ссылки содержат ИД.
         */
        if (!update.linked?.id) {
            const linkedIds = getIdsFromText(update.body);
            for (const linkedId of linkedIds) {
                if (await isIdRelevant(linkedId)) {
                    update.linked = await createLinked(linkedId);
                    const titleForLog = `${update.title} -- ${update?.linked?.russian || update?.linked?.name}`
                    console.log(`Отпрака уведомления:`, titleForLog);
                    await sendNotification(update);
                    break;
                }
            }

            const titleForLog = `${update.title} -- ${update?.linked?.russian || update?.linked?.name}`
            console.log(`Не релевантно:`, titleForLog);
        } else if (await isIdRelevant(update.linked.id)) {
            const titleForLog = `${update.title} -- ${update?.linked?.russian || update?.linked?.name}`
            console.log(`Отпрака уведомления:`, titleForLog);
            await sendNotification(update);
        } else {
            const titleForLog = `${update.title} -- ${update?.linked?.russian || update?.linked?.name}`
            console.log(`Не релевантно:`, titleForLog);
        }
    }
}

(async () => {
    try {

        const updates = [
            ...await loadTopics(LAST_CHECK_TIME, 'updates').then(arr => {
                console.log('Загружено обновлений: ', arr.length)
                return arr
            }),
            ...await loadTopics(LAST_CHECK_TIME, 'news').then(arr => {
                console.log('Загружено новостей: ', arr.length)
                return arr
            }),
        ]

        if (updates.length === 0) {
            return
        }

        await processUpdates(updates)

        const maxTopicTime = Math.max(...updates.map(t => t.created_at))

        await writeFile(LAST_CHECK_TIME_PATH, `${maxTopicTime}`, {encoding: 'utf-8'})
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
})()

