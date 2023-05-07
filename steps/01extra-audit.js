const fetch = require('node-fetch');
const { writeFileAsync } = require('../util');
const { join } = require('path');
const { nextStep, debugInfo } = require('../cache');

module.exports = async function (contractId) {

	nextStep(contractId, 'Getting more details...');

	const tokenAuditRes = await fetch(`https://dapp.herokuapp.com/token-audit?contract=${contractId}`).catch(() => {});

	if (!tokenAuditData) {
		debugInfo(contractId, 'Failed to get token audit data');
		throw new Error('invalid_contract');
	}

	const tokenAuditData = await tokenAuditRes.json();

	if (!tokenAuditData.is_open_source) {
		debugInfo(contractId, 'Contract is not verified');
		throw new Error('invalid_contract');
	}

	debugInfo(contractId, 'Contract is verified and token audit data is available');

	await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'token-audit.json'), JSON.stringify(tokenAuditData, null, 2), 'utf-8');

	return contractId;
};
