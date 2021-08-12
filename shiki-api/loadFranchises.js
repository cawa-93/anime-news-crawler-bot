import {call}          from './call.js';

/**
 * @typedef FranchiseGraph
 * @property {{id: number}[]} nodes
 */


/**
 *
 * @param {number} id
 * @return {Promise<FranchiseGraph>}
 */
export function loadFranchise(id) {
	return call(`animes/${id}/franchise`)
}
