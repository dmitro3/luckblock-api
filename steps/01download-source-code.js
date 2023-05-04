const { nextStep } = require('../cache');
const { makeDirAsync, existsAsync, writeFileAsync } = require('../util');
const { join } = require('path');

const getData = async (contractId) => {
	const res = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractId}`);
	const data = await res.json();

	if (data.result[0].ABI === 'Contract source code not verified') {
		throw new Error('invalid_contract');
	}

	if (data.result === 'Max rate limit reached, please use API Key for higher rate limit') {
		return getData(contractId);
	}

	return data;
}

module.exports = async function (contractId) {

	nextStep(contractId, 'Downloading contract source code...');

	if (!await existsAsync(process.env.TMP_ROOT_DIR)) await makeDirAsync(process.env.TMP_ROOT_DIR);

	const data = await getData(contractId);

	const sources = data.result[0].SourceCode.startsWith('{{') ? JSON.parse(data.result[0].SourceCode.slice(1, -1)).sources : {
		'main.sol': {
			content: data.result[0].SourceCode
		}
	};
	if (!await existsAsync(join(process.env.TMP_ROOT_DIR, contractId))) await makeDirAsync(join(process.env.TMP_ROOT_DIR, contractId));
	if (!await existsAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources'))) await makeDirAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources'));
	for(let key in sources) {
		const content = sources[key].content;
		// write file in directory
		const subfolders = key.split('/');
		for (let i = 1; i < subfolders.length; i++) {
			if (await existsAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources', join(...subfolders.slice(0, i))))) continue;
			await makeDirAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources', join(...subfolders.slice(0, i))));
		}
		await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources', key), content, 'utf-8');
	}

	const mainFile = Object.keys(sources)[0] || 'main.sol';
	await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'main.txt'), mainFile, 'utf-8');

	return contractId;

};