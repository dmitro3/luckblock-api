const chalk = require('chalk');

module.exports.startsAt = {};
module.exports.pending = {};

module.exports.nextStep = (contractId, step) => {
	console.log(`[${chalk.greenBright(`${contractId}`)}] ${step} (step)`);
	module.exports.pending[contractId] = step;
};

module.exports.debugInfo = (contractId, info) => {
	console.log(`[${chalk.cyanBright(`${contractId}`)}] ${info} (debug)`);
};


setInterval(() => {
	Object.keys(module.exports.pending).forEach(contractId => {
		if (module.exports.startsAt[contractId] < Date.now() - 60 * 1000) {
			console.log(`[${chalk.redBright(`${contractId}`)}] Job timed out.`);
			delete module.exports.pending[contractId];
			delete module.exports.startsAt[contractId];
		}
	});
}, 5000);
