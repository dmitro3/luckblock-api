const { pending, startsAt, debugInfo, errors } = require('./cache');
const { ContractAudit } = require('./postgres');

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
	delete errors[contractId];

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
		.then(async () => {

			const contractAudit = await ContractAudit.findOne({
				where: {
					contractId
				}
			});
			if (contractAudit) {
				contractAudit.update({
					isProcessed: true
				});
			}
			delete pending[contractId];
			delete startsAt[contractId];
			debugInfo(contractId, `Done in ${(Date.now() - startAt) / 1000} seconds`);
		})
		.catch((err) => {
			handleErr(err);

			const msg = err.message || err;

			const errorMessages = {
				'unsupported_contract': 'This contract is not supported.',
				'unverified_contract': 'The code of this contract is not verified.',
				'invalid_contract': 'The code of this contract is invalid.',
				'unsupported_vyper_contract': 'This contract is written in Vyper, which is not supported yet.'
			};

			errors[contractId] = errorMessages[msg] || msg;
		});

};
