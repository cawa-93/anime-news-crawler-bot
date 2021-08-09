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
 */
async function getFormattedMessage(update) {
	const title = `<b><a href="${update.url}">${update.title}</a></b>`;
	const about = `<a href="https://shikimori.one${update.linked.url}">${update.linked.russian
	                                                                     || update.linked.name}</a>`;
	const body = update.body ? '\n\n' + clearHTML(update.body).trim().substr(0, 4000) : '';
	const franchise = await getFranchiseById(update.linked.id);
	const hashtag = franchise ? '\n#' + franchise : '';
	return `${title}\nоб ${about}${body}${hashtag}`.replace(/\n{3,}/, '\n\n');
}


/**
 *
 * @param {ResolvedTopic} update
 */
export async function sendNotification(update) {
	const bot = getBot();
	return bot.telegram.sendMessage(process.env.TARGET_CHAT_ID, await getFormattedMessage(update), {parse_mode: 'HTML'})
		.catch(e => {
			console.log(e);
			bot.telegram.sendMessage(
				process.env.TARGET_CHAT_ID,
				e + e.stack + '\n\n TOPIC:\n\n' + JSON.stringify(update));
		}).catch(console.error);
}


