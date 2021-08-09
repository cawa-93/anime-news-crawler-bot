import {config}         from 'dotenv'
import {loadFranchises} from './shiki-api/loadFranchises.js';
import {loadUserRates}  from './shiki-api/loadUserRates.js';

config()

loadFranchises().then(console.log).catch(console.error)
