import {call} from './call.js';

/**
 * @typedef TopicLinked
 * @property {number} id
 * @property {string} name
 * @property {string} russian
 * @property {string} url
 * @property {number} episodes
 * @property {number} episodes_aired
 */


/**
 * @typedef UpdateTopic
 * @property {number} id
 * @property {TopicLinked} linked
 * @property {string} url
 * @property {string} created_at
 * @property {'episode'|'released'|'ongoing'|'anons'|null} event
 * @property {number|null} episode
 * @property {number} created_at
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
    return call(`topics/updates?${search}`)
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
 * @property {TopicLinked|null} linked
 * @property {string} url
 * @property {'episode'|'released'|'ongoing'|'anons'|null} event
 * @property {number} created_at
 */

/**
 *
 * @param {number} before_at
 * @param {'news'|'updates'} type
 * @return {Promise<ResolvedTopic[]>}
 */
export async function loadTopics(before_at, type) {
    let page = 1;
    const limit = 30;

    const newTopicsFromLastCheck = [];

    const loader = type === 'updates' ? getUpdates : getNews;
    const resolver = type === 'updates' ? resolveUpdateTopic : resolveNewsTopic;


    while (true) {
        const topics = await loader(page++, limit);
        console.log(`topics.length`, topics.length)
        if (topics.length === 0) {
            break;
        }

        console.log({ALLOWED_UPDATE_EVENTS})

        for (let i = 0; i < limit; i++) {
            const topic = topics[i];
            const topicTime = new Date(topic.created_at).getTime();

            console.log({topicTime, before_at}, topicTime <= before_at)
            if (topicTime <= before_at) {
                console.log('EXIT', newTopicsFromLastCheck.length)
                return newTopicsFromLastCheck;
            }

            console.log(type, {event: topic.event, isAllowed: ALLOWED_UPDATE_EVENTS.includes(topic.event)})
            if (type === 'updates' && !ALLOWED_UPDATE_EVENTS.includes(topic.event)) {
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


const dateFormat = new Intl.DateTimeFormat('uk', {month: 'long', day: 'numeric', year: 'numeric'})

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

    let body = ''
    if (update.event === 'ongoing' && update.linked?.episodes) {
        const episodesToEnd = update.linked.episodes - update.linked.episodes_aired;
        const week = 1000 * 60 * 60 * 24 * 7
        const proposedReleaseDate = Date.now() + episodesToEnd * week
        body = `Предположительная дата завершения: <b>${dateFormat.format(proposedReleaseDate)}</b>`
    }

    return {
        title,
        url: update.url,
        linked: update.linked,
        event: update.event,
        body,
        created_at: (new Date(update.created_at)).getTime()
    };
}


/**
 * @typedef NewsTopic
 * @property {number} id
 * @property {string} topic_title
 * @property {string} html_body
 * @property {TopicLinked|null} linked
 * @property {{url: string}} forum
 * @property {number} created_at
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
        event: null,
        created_at: (new Date(topic.created_at)).getTime()
    };
}
