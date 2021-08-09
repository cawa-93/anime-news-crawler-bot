import {call} from './call.js';


/**
 * @typedef Topic
 * @property {number} id
 * @property {{id: number, name: string, russian: string, url: string}} linked
 * @property {string} url
 * @property {string} created_at
 */

/**
 * Возвращает массив обновлений
 *
 * @param {number} page
 * @param {number} limit
 * @return {Promise<Topic[]>} Возвналает на limit+1 результатов больше если существует следующая страница пагинации
 */

function getTopics(page, limit) {
	const search = new URLSearchParams({page, limit});
	return call(`topics/updates?${search}`);
}


/**
 *
 * @param before_at
 * @return {Promise<Topic[]>}
 */
export async function loadUpdates(before_at) {
	let page = 1;
	const limit = 30;

	const newTopicsFromLastCheck = [];

	while (true) {
		const topics = await getTopics(page++, limit);

		if (topics.length === 0) {
			break;
		}

		for (let i = 0; i < limit; i++) {
			const topic = topics[i];
			const topicTime = new Date(topic.created_at).getTime();
			if (topicTime < before_at) {
				return newTopicsFromLastCheck;
			}

			newTopicsFromLastCheck.push(topic);
		}

		/**
		 * Если количество загруженных топиков меньше или равно лимиту значит
		 * это все доступные результаты и следующей страницы пагинации не существует
		 */
		if (topics.length <= limit) {
			break;
		}
	}

	return newTopicsFromLastCheck;
}
