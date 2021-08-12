import * as cheerio       from 'cheerio';
import {getFranchiseById} from './getFranchiseById.js';
import {Telegraf}         from 'telegraf';


let bot = null;


function getBot() {
	if (bot !== null) {
		return bot;
	}

	bot = new Telegraf(process.env.BOT_TOKEN);
	return bot;
}


function clearHTML(str) {
	const $ = cheerio.load(str, null, false);
	$('*:not(i,em,b,strong,pre,code,a,br)').replaceWith((i, el) => $.text(el, null, false));
	$('br').replaceWith('\n');
	$('*').removeAttr('title rel class data-tooltip_url data-attrs t itle le tit id');
	$('*:empty').remove();
	return $.html({});
}


/**
 *
 * @param {ResolvedTopic} update
 * @return {Promise<string>}
 */
async function getFormattedMessage(update) {

	const animeTitle = update.linked?.russian || update.linked?.name || '';
	const animeLink = update.linked?.url ? `<a href="https://shikimori.one${update.linked.url}">${animeTitle}</a>` : '';

	const header = update.event
	               ? `<b>${update.title}</b> ${animeLink}`
	               : `${animeLink}\n\n<b>${update.title}</b> <a href="${update.url}">🔗</a>`.trim();

	let body = '';
	if (update.body?.trim()) {
		body = clearHTML(update.body).trim();
		// Обрезать текст по первому обзацу
		if (body) {
			const paragraphs = body.split(/\n{2,}/).map(p => p.trim());
			body = paragraphs[0];
		}
	}

	const franchise = update.linked?.id ? await getFranchiseById(update.linked.id) : null;
	const hashtag = franchise ? '#' + franchise : '';

	return `${header}\n\n${body}\n\n${hashtag}`.trim().replace(/\n{3,}/, '\n\n');
}


/**
 *
 * @param {ResolvedTopic} update
 */
export async function sendNotification(update) {
	const bot = getBot();

	try {
		const message = await getFormattedMessage(update)
		await bot.telegram.sendMessage(
			process.env.TARGET_CHAT_ID,
			message,
			{
				disable_web_page_preview: true,
				parse_mode: 'HTML',
			})
	} catch (e) {
		console.error(e);
		await bot.telegram.sendMessage(process.env.TARGET_CHAT_ID, e + e.stack + '\n\n TOPIC: ' + update.url)
	}
}


