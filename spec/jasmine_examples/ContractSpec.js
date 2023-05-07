/* eslint-disable no-undef */

const [ cleanUp, extraAudit, downloadSourceCode, runSlither ] = [
	require('../../steps/00cleanup'),
	require('../../steps/01extra-audit'),
	require('../../steps/02download-source-code'),
	require('../../steps/03run-slither')
];

const dotenv = require('dotenv');
dotenv.config();

//process.env.NODE_ENV = 'test';
process.env.NODE_ENV = 'superdebug';

describe('testing contracts', () => {

	const contractIds = ['0x15d4c048f83bd7e37d49ea4c83a07267ec4203da'];

	contractIds.forEach((contractId) => {

		it(contractId, () => {

			return cleanUp(contractId)
				.then(extraAudit)
				.then(downloadSourceCode)
				.then(runSlither)
				.then((contractIdFinal) => {
					expect(contractIdFinal)
						.withContext('unknown error')
						.toBe(contractId);
				})
				.catch((err) => {
					throw err;
				});
            
		}, 20000);

	});

});
