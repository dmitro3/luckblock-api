const { nextStep } = require('../cache');
const { existsAsync, rmAsync, makeDirAsync } = require('../util');
const { join } = require('path');

module.exports = async function (contractId) {

	nextStep(contractId, 'Cleaning up files...');

	if (
		await existsAsync(process.env.TMP_ROOT_DIR)
        && await existsAsync(join(process.env.TMP_ROOT_DIR, contractId))
	) {
		await rmAsync(join(process.env.TMP_ROOT_DIR, contractId), { recursive: true });
	}

	if (!(await existsAsync(process.env.TMP_ROOT_DIR))) {
		await makeDirAsync(process.env.TMP_ROOT_DIR);
	}

	await makeDirAsync(join(process.env.TMP_ROOT_DIR, contractId));

	return contractId;

};