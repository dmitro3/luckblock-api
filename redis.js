const chalk = require('chalk');
const { createClient } = require('redis');
const client = createClient({
	database: parseInt(process.env.REDIS_DB)
});

client.on('error', err => console.log('Redis Client Error', err));

client.connect();

module.exports.redisClient = client;

module.exports.nextStep = (contractId, step) => {
	console.log(`[step] [${chalk.greenBright(`${contractId}`)}] ${step}`);
	this.redisClient.set(contractId, step);
};

module.exports.debugInfo = (contractId, info) => {
	console.log(`[debug] [${chalk.cyanBright(`${contractId}`)}] ${info}`);
};
