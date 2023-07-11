/* eslint-disable no-undef */

const [ cleanUp, extraAudit, downloadSourceCode, runSlither ] = [
	require('../../steps/00cleanup'),
	require('../../steps/01extra-audit'),
	require('../../steps/02download-source-code'),
	require('../../steps/03run-slither')
];

const dotenv = require('dotenv');
dotenv.config();

process.env.NODE_ENV = 'test';
//rocess.env.NODE_ENV = 'superdebug';

describe('testing contracts', () => {

	const contractIds = ['0x5283d291dbcf85356a21ba090e6db59121208b44#'];

	contractIds.forEach((contractId) => {

		it(contractId, () => {

			return cleanUp(contractId)
				.then(extraAudit)
				.then(downloadSourceCode)
				.then(runSlither)
				.then(([contractIdFinal, data]) => {

					expect(data?.functionNames?.length).toBeGreaterThan(4);

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
