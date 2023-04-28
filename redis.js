const chalk = require('chalk');
const { createClient } = require('redis');
const client = createClient();

client.on('error', err => console.log('Redis Client Error', err));

client.connect();

module.exports.redisClient = client;

module.exports.nextStep = (contractId, step) => {
	console.log(`[${chalk.blue(`${contractId}`)}] ${step}`);
	this.redisClient.set(contractId, step);
};

module.exports.debugInfo = (contractId, info) => {
	console.log(`[${chalk.cyanBright(`${contractId}`)}] ${info}`);
};
