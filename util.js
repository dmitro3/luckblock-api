const fs = require('fs');
const promisify = require('util').promisify;
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const makeDirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
const unlinkAsync = promisify(fs.unlink);

module.exports = {
	writeFileAsync,
	readFileAsync,
	makeDirAsync,
	existsAsync,
	unlinkAsync
};
