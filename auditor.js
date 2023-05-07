const { pending, startsAt, debugInfo } = require('./cache');

const [
	cleanUp,
	downloadSourceCode,
	runSlither,
	chatGPT,
	extraAudit,
	generatePDF
] = [
	require('./steps/00cleanup'),
	require('./steps/01extra-audit'),
	require('./steps/02download-source-code'),
	require('./steps/03run-slither'),
	require('./steps/04chatgpt'),
	require('./steps/05generate-pdf')
];

module.exports.triggerAuditReport = async function (contractId) {

	const startAt = Date.now();

	pending[contractId] = 'Starting your job...';
	startsAt[contractId] = startAt;

	const handleErr = (err) => {
		console.log('ERR!');
		console.error(err);
		delete pending[contractId];
	};

	await cleanUp(contractId)
		.then(downloadSourceCode)
		.then(runSlither)
		.then(chatGPT)
		.then(extraAudit)
		.then(generatePDF)
		.then(() => {
			delete pending[contractId];
			delete startsAt[contractId];
			debugInfo(contractId, `Done in ${(Date.now() - startAt) / 1000} seconds`);
		})
		.catch(handleErr);

};
