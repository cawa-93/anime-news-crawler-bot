import * as https from 'https';


/**
 *
 * @param {string|URL} url
 * @return {Promise<unknown>}
 */
function request(url) {
	const headers = {
		'User-Agent': 'Personal news feed. Owner: ' + process.env.APP_OWNER
	}
	return new Promise((resolve, reject) => {
		const req = https.request(url, {headers}, res => {
			let buffer = ''
			res.on('data', chunk => buffer += chunk);
			res.on('end', () => resolve({status: res.statusCode, body: buffer}));
		});

		req.on('error', reject);
		req.end()
	});
}


/**
 * Предотвращает повторные однотипные запросы к серверу в пределах одной сессии
 * @type {Map<string, any>}
 */
const runtimeCache = new Map

/**
 * Выполняет засетевой запрос к Шикимори
 * Повторяет запрос если возникла ошибка превышения лимита RPS или RPM
 * Все ответы кэшируются -- повторный запрос к тому же апи не будет отправляться на сервер
 * @param {string} input
 * @return {Promise<any>}
 */
export function call(input) {

	const cachedResponse = runtimeCache.get(input)

	if (cachedResponse) {
		return Promise.resolve(cachedResponse)
	}

	return request(`https://shikimori.one/api/${input}`)
		.then(({status, body}) => {
			if (status === 200) {
				const responseData = JSON.parse(body)
				runtimeCache.set(input, responseData)
				return responseData
			} else if (status === 429) {
				console.log(`Api request failed with status code ${status}. Retrying ...`);
				return new Promise(r => setTimeout(r, 1000 + 1000 * Math.random())).then(() => call(input))
			} else {
				return Promise.reject(body)
			}
		});
}
