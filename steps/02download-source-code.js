const { nextStep, debugInfo } = require('../cache');
const { makeDirAsync, existsAsync, writeFileAsync } = require('../util');
const { join } = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const getData = async (contractId) => {

	if (process.env.PROXY_URL) {
		debugInfo(contractId, 'Fetching using proxy...');
	}

	const res = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractId}`, {
		agent: process.env.PROXY_URL ? new HttpsProxyAgent(process.env.PROXY_URL) : null
	});
	const data = await res.json();

	if (data.result[0].ABI === 'Contract source code not verified') {
		throw new Error('invalid_contract');
	}

	if (data.result === 'Max rate limit reached, please use API Key for higher rate limit') {
		return getData(contractId);
	}

	return data;
};

module.exports = async function (contractId) {

	nextStep(contractId, 'Downloading contract source code...');

	const data = await getData(contractId);

	if (process.env.NODE_ENV === 'superdebug') {
		await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sourcecode.json'), JSON.stringify(data, null, 2), 'utf-8');
	}

	const sources = data.result[0].SourceCode.startsWith('{{') ? JSON.parse(data.result[0].SourceCode.slice(1, -1)).sources : 
		data.result[0].SourceCode.startsWith('{') ? JSON.parse(data.result[0].SourceCode) : {
			'main.sol': {
				content: data.result[0].SourceCode
			}
		};
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

	let mainFile = Object.keys(sources)[0] || 'main.sol';
	if (mainFile.startsWith('/')) {
		mainFile = mainFile.slice(1);
	}
	await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'main.txt'), mainFile, 'utf-8');

	return contractId;

};