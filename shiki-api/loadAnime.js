import {call} from './call.js';

/**
 * @typedef Anime
 * @property {number} id
 * @property {string} name
 * @property {string} russian
 * @property {string | null} franchise
 * @property {string} url
 */

/**
 *
 * @param {number} id
 * @return {Promise<Anime>}
 */
export function loadAnime(id) {
	return call(`animes/${id}`)
}
