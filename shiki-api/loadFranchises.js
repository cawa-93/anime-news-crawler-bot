import {loadAnime}     from './loadAnime.js';
import {call}          from './call.js';
import {loadUserRates} from './loadUserRates.js';

/**
 * @typedef FranchiseGraph
 * @property {{id: number}[]} nodes
 */

/**
 * Задержка между итерациями. Нужна чтобы не превышать RPS и RPM лимиты
 * RPS = 5
 * RPM = 90
 * @type {number}
 */
const ITERATION_TIMEOUT = process.env.UPDATE_FRANCHISES_ITERATION_LIMIT || 1000


/**
 *
 * @param {number} id
 * @return {Promise<FranchiseGraph>}
 */
export function loadFranchise(id) {
	return call(`animes/${id}/franchise`)
}

/**
 * @deprecated
 * @param {number} user_id
 * @return {Promise<Map<string, Set<number>>>}
 */
export async function loadFranchises(user_id = process.env.SHIKI_USER_ID) {
	const rates = await loadUserRates({user_id, type: ['Anime']});

	const ids = new Set(rates.map(r => r.target_id));

	/** @type Map<string, Set<number>> */
	const franchises = new Map();

	while (ids.size > 0) {
		console.log(`Ids left: ${ids.size}`);
		const id = ids.values().next().value;

		const [franchiseGraph, anime] = await Promise.all([
			loadFranchise(id),
			loadAnime(id),
		]);

		const saved = franchises.get(anime.franchise) || new Set

		saved.add(id)
		franchiseGraph.nodes.forEach((node) => saved.add(node.id))

		franchises.set(anime.franchise, saved)

		for (const id of saved.values()) {
			ids.delete(id)
		}

		// Немного подождать чтобы не превышать лимитов на запрос
		await new Promise(r => setTimeout(r, ITERATION_TIMEOUT))
	}

	return franchises
}
