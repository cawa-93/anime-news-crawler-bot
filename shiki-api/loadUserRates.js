/**
 * @typedef {("planned"|"watching"|"rewatching"|"completed"|"on_hold"|"dropped")} UserRateStatus
 */

/**
 * @typedef {("Anime"|"Manga")} UserRateType
 */

/**
 * @typedef UserRate
 * @property {number} target_id
 * @property {UserRateType} target_type
 * @property {UserRateStatus} status
 */

import {call} from './call.js';


/**
 *
 * @param {UserRateType[]} type
 * @param {UserRateStatus[]} status
 * @param {number} user_id
 * @return {Promise<UserRate[]>}
 */
export function loadUserRates({type = undefined, status= ['completed', 'watching', 'rewatching', 'planned'], user_id = process.env.SHIKI_USER_ID} = {}) {
	if (!user_id) {
		throw new Error('Expected user_id as number but got ' + JSON.stringify(user_id))
	}

	const search = new URLSearchParams({
		user_id,
		type: type ? type.join(',') : '',
		status: status ? status.join(',') : '',
	})

	return call(`v2/user_rates?${search}`)
}
