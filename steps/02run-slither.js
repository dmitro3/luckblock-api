const { join, parse } = require('path');
const chokidar = require('chokidar');
const childProcess = require('child_process');
const { readFile } = require('fs');
const { nextStep, debugInfo } = require('../cache');
const { writeFileAsync, readFileAsync } = require('../util');
const semver = import('semver-parser');

module.exports = function (contractId) {

	nextStep(contractId, 'Identifying major issues...');

	return new Promise((resolve, reject) => {

		readFile(join(process.env.TMP_ROOT_DIR, contractId, 'main.txt'), 'utf-8', (err1, mainFileName) => {

			debugInfo(contractId, `Main file detected: ${mainFileName}`);

			if (err1) {
				reject(err1);
			}

			readFile(join(process.env.TMP_ROOT_DIR, contractId, 'sources', mainFileName), 'utf-8', (err2, mainFileContent) => {

				if (err2) {
					reject(err2);
				}

				getVersion(mainFileContent).then(version => {

					debugInfo(contractId, `Solidity version detected: ${version.version}`);

					writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'version.json'), JSON.stringify(version), 'utf-8');

					const options = {
						env: {
							SOLC_VERSION: version.version,
							PATH: '/bin:/usr/bin:/usr/local/bin',
							...process.env
						},
						cwd: join(process.env.TMP_ROOT_DIR, contractId, 'sources')
					};

					const watcher = chokidar.watch(join(process.env.TMP_ROOT_DIR, contractId));

					let analysisCreated = false;
					let dotFileCreated = false;
	
					watcher.on('add', async (path) => {
						if (path === join(process.env.TMP_ROOT_DIR, contractId, 'analysis.json')) {
							analysisCreated = true;
							debugInfo(contractId, `Analysis file detected: ${path}`);
						} else if (
							path.endsWith('all_contracts.call-graph.dot')
						) {
							debugInfo(contractId, `Call graph file detected: ${path}`);
							dotFileCreated = true;
							setTimeout(() => {
								childProcess.spawn('dot', ['-Tdot_json', parse(path).base, '-o', `${join('..', 'call-graph')}.json`], options);
							}, 1000);
						} else if (path === join(process.env.TMP_ROOT_DIR, contractId, 'call-graph.json')) {
							if (analysisCreated && dotFileCreated) {
								debugInfo(contractId, `Call graph file detected: ${path}`);

								const tokenName = /contract ([A-Za-z0-0_]+) is ERC20/g.exec(mainFileContent)[1];

								debugInfo(contractId, `Token name detected: ${tokenName}`);

								const data = JSON.parse(await readFileAsync(path));
								const tokenData = data.objects.find((d) => d.name.startsWith('cluster') && d.name.endsWith(tokenName));

								if (tokenData) {
									const functionIds = tokenData.nodes;
									const functionNames = data.objects
										.filter((obj) => functionIds.includes(obj._gvid))
										.filter((obj) => obj.label)
										.filter((obj) => obj.label !== '\\N')
										.map((obj) => obj.label);
									await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'function-names.json'), JSON.stringify(functionNames, null, 2));
								}

								setTimeout(() => {
									resolve(contractId);
								}, 1000);
							}
						}
					});

					childProcess.spawn('slither', [mainFileName, '--json', `${join('..', 'analysis')}.json`], options);
					childProcess.spawn('slither', [mainFileName, '--print', `call-graph`], options);

				}).catch(err => {
					reject(err);
				});
			});

		});

	});

};

async function getVersion (mainFileContent) {
	let finalVersion = '0.0.0';

	const matchs = mainFileContent.match(/pragma solidity (\^)?([0-9.]+);/);
	const [, caret, version] = matchs;
	const { parseSemVer } = await semver;
	const { major, minor, patch } = parseSemVer(version);
	if (caret) {
		const versions = getVersions();
		let newPatch = patch;
		while (versions.includes(`${major}.${minor}.${newPatch+1}`)) {
			newPatch++;
		}
		finalVersion = `${major}.${minor}.${newPatch}`;
	} else {
		finalVersion = `${major}.${minor}.${patch}`;
	}

	return parseSemVer(finalVersion);
}

function getVersions () {
	return ['0.8.9','0.8.8','0.8.7','0.8.6','0.8.5','0.8.4','0.8.3','0.8.2','0.8.19','0.8.18','0.8.17','0.8.16','0.8.15','0.8.14','0.8.13','0.8.12','0.8.11','0.8.10','0.8.1','0.8.0','0.7.6','0.7.5','0.7.4','0.7.3','0.7.2','0.7.1','0.7.0','0.6.9','0.6.8','0.6.7','0.6.6','0.6.5','0.6.4','0.6.3','0.6.2','0.6.12','0.6.11','0.6.10','0.6.1','0.6.0','0.5.9','0.5.8','0.5.7','0.5.6','0.5.5','0.5.4','0.5.3','0.5.2','0.5.17','0.5.16','0.5.15','0.5.14','0.5.13','0.5.12','0.5.11','0.5.10','0.5.1','0.5.0','0.4.9','0.4.8','0.4.7','0.4.6','0.4.5','0.4.4','0.4.3','0.4.26','0.4.25','0.4.24','0.4.23','0.4.22','0.4.21','0.4.20','0.4.2','0.4.19','0.4.18','0.4.17','0.4.16','0.4.15','0.4.14','0.4.13','0.4.12','0.4.11','0.4.10','0.4.1','0.4.0','0.3.6'];
}
