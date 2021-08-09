import {loadAnime} from './shiki-api/loadAnime.js';


/**
 *
 * @type {Map<number, string>}
 */
const cache = new Map;


export async function getFranchiseById(id) {
	const franchise = cache.get(id);

	if (franchise) {
		return franchise;
	}

	const anime = await loadAnime(id);

	if (anime.franchise) {
		cache.set(id, anime.franchise);
	}

	return anime.franchise;
}
