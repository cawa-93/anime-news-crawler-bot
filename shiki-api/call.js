import * as https from 'https';


/**
 *
 * @param {string|URL} options
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
 *
 * @param {string} input
 * @return {Promise<any>}
 */
export function call(input) {
	return request(`https://shikimori.one/api/${input}`)
		.then(({status, body}) => {
			if (status === 200) {
				return JSON.parse(body)
			} else if (status === 429) {
				console.log(`Api request failed with status code ${status}. Retrying ...`);
				return new Promise(r => setTimeout(r, 1000 + 1000 * Math.random())).then(() => call(input))
			} else {
				return Promise.reject(body)
			}
		});
}
