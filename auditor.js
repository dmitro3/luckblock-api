const { redisClient, debugInfo } = require('./redis');

const [
	cleanUp,
	downloadSourceCode,
	runSlither,
	chatGPT,
	extraAudit,
	generatePDF
] = [
	require('./steps/00cleanup'),
	require('./steps/01download-source-code'),
	require('./steps/02run-slither'),
	require('./steps/03chatgpt'),
	require('./steps/04extra-audit'),
	require('./steps/05generate-pdf')
];

module.exports.triggerAuditReport = async function (contractId) {

	const startAt = Date.now();

	await redisClient.set(contractId, 'Starting your job...');
	redisClient.expire(contractId, 60 * 10);

	const handleErr = (err) => {
		console.log('ERR!');
		console.error(err);
		redisClient.del(contractId);
	};

	await cleanUp(contractId)
		.then(downloadSourceCode)
		.then(runSlither)
		.then(chatGPT)
		.then(extraAudit)
		.then(generatePDF)
		.then(() => {
			redisClient.del(contractId);
			debugInfo(contractId, `Done in ${(Date.now() - startAt) / 1000} seconds`);
		})
		.catch(handleErr);

};
