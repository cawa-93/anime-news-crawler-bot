import {call} from './call.js';

/**
 * @typedef {{id: number, name: string, russian: string, url: string}} TopicLinked
 */


/**
 * @typedef UpdateTopic
 * @property {number} id
 * @property {TopicLinked} linked
 * @property {string} url
 * @property {string} created_at
 * @property {'episode'|'released'|'ongoing'|'anons'|null} event
 * @property {number|null} episode
 */

/**
 * Возвращает массив обновлений
 *
 * @param {number} page
 * @param {number} limit
 * @return {Promise<UpdateTopic[]>} Возвналает на limit+1 результатов больше если существует следующая страница
 *   пагинации
 */
function getUpdates(page, limit) {
	const search = new URLSearchParams({page, limit});
	return call(`topics/updates?${search}`);
}


/**
 * Возвращает массив новостных форумов
 *
 * @param {number} page
 * @param {number} limit
 * @return {Promise<UpdateTopic[]>} Возвналает на limit+1 результатов больше если существует следующая страница
 *   пагинации
 */
function getNews(page, limit) {
	const search = new URLSearchParams({
		page,
		limit,
		type: 'Topics::NewsTopic',
		forum: 'news',
		linked_type: 'Anime',
	});
	return call(`topics?${search}`);
}


const ALLOWED_UPDATE_EVENTS = process.env.ALLOWED_UPDATE_EVENTS
                              ? process.env.ALLOWED_UPDATE_EVENTS.split(',').map(s => s.trim)
                              : ['released', 'ongoing'];


/**
 * @typedef ResolvedTopic
 * @property {string|undefined} title
 * @property {string|undefined} body
 * @property {TopicLinked} linked
 * @property {string} url
 */

/**
 *
 * @param {number} before_at
 * @param {'news'|'updates'} type
 * @return {Promise<UpdateTopic[]>}
 */
export async function loadTopics(before_at, type) {
	let page = 1;
	const limit = 30;

	const newTopicsFromLastCheck = [];

	const loader = type === 'updates' ? getUpdates : getNews;
	const resolver = type === 'updates' ? resolveUpdateTopic : resolveNewsTopic;

	while (true) {
		const topics = await loader(page++, limit);
		if (topics.length === 0) {
			break;
		}

		for (let i = 0; i < limit; i++) {
			const topic = topics[i];
			const topicTime = new Date(topic.created_at).getTime();
			if (topicTime < before_at) {
				return newTopicsFromLastCheck;
			}

			if (type === 'updates' && !ALLOWED_UPDATE_EVENTS.includes(topic.event)) {
				continue;
			}

			if (!topic.linked) {
				continue;
			}

			newTopicsFromLastCheck.push(resolver(topic));
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


/**
 *
 * @param {UpdateTopic} update
 * @returns {ResolvedTopic}
 */
function resolveUpdateTopic(update) {
	const title = update.event === 'anons'
	              ? 'Анонсировано аниме'
	              : update.event === 'ongoing'
	                ? 'Начало показа'
	                : update.event === 'released'
	                  ? 'Показ завершен'
	                  : update.event === 'episode'
	                    ? `Вышла серия ${update.episode}`
	                    : update.event + ' event';

	return {
		title,
		url: update.url,
		linked: update.linked,
	};
}


/**
 * @typedef NewsTopic
 * @property {number} id
 * @property {string} topic_title
 * @property {string} html_body
 * @property {TopicLinked} linked
 * @property {{url: string}} forum
 */

/**
 *
 * @param {NewsTopic} topic
 * @returns {ResolvedTopic}
 */
function resolveNewsTopic(topic) {
	return {
		title: topic.topic_title,
		body: topic.html_body,
		linked: topic.linked,
		url: `https://shikimori.one${topic.forum.url}/${topic.id}/`,
	};
}
