import {loadAnime} from './shiki-api/loadAnime.js';

export async function getFranchiseById(id) {
	return loadAnime(id).then(anime => anime.franchise);
}
