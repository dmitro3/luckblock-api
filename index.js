const fetch = require('node-fetch');
const fs = require('fs');
const childProcess = require('child_process');
const { join } = require('path');

const promisify = require('util').promisify;
const writeFileAsync = promisify(fs.writeFile);
const makeDirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

const chokidar = require('chokidar');

let startDate = Date.now();

const _contractId = process.argv[2];
const rootDir = 'analyses';
const sourcesSubdir = 'sources';

const writeSourceCode = async (contractId) => {

    if (!await existsAsync(rootDir)) await makeDirAsync(rootDir);

    const res = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractId}`)
    const data = await res.json();

    const sources = JSON.parse(data.result[0].SourceCode.slice(1, -1)).sources;
    if (!await existsAsync(join(rootDir, contractId))) await makeDirAsync(join(rootDir, contractId));
    if (!await existsAsync(join(rootDir, contractId, sourcesSubdir))) await makeDirAsync(join(rootDir, contractId, sourcesSubdir));
    for(let key in sources) {
        const content = sources[key].content;
        // write file in directory
        const subfolders = key.split('/');
        for (let i = 1; i < subfolders.length; i++) {
            if (await existsAsync(join(rootDir, contractId, sourcesSubdir, join(...subfolders.slice(0, i))))) continue;
            await makeDirAsync(join(rootDir, contractId, sourcesSubdir, join(...subfolders.slice(0, i))));
        }
        await writeFileAsync(join(rootDir, contractId, sourcesSubdir, key), content, 'utf-8');
    }

    return Object.keys(sources)[0];
};

const generateAuditReport = async (contractId) => {

    const mainFile = await writeSourceCode(contractId);

    const watcher = chokidar.watch(join(rootDir, contractId));

    watcher.on('add', (path) => {
        if (path === join(rootDir, contractId, 'analysis.json')) {
            console.log(`analysis.json created in ${Date.now() - startDate}ms`);
            watcher.close();

            const analysis = require(join(rootDir, contractId, 'analysis.json'));
        }
    });

    childProcess.spawn(`slither`, [mainFile, `--json`, `${join('..', 'analysis')}.json`], {
        cwd: join(rootDir, contractId, sourcesSubdir)
    });

    return 'aa';

}

generateAuditReport(_contractId).then((pdf) => {
    fs.writeFile('audit.pdf', pdf, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
})