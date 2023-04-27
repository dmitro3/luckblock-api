require('dotenv').config();

const fetch = require('node-fetch');
const fs = require('fs');
const childProcess = require('child_process');
const { join } = require('path');
const chokidar = require('chokidar');

const promisify = require('util').promisify;
const writeFileAsync = promisify(fs.writeFile);
const makeDirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

const { PDFDocument, PDFName, PDFString, rgb, breakTextIntoLines } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();
const pako = require('pako');

const fastify = require('fastify')({
	logger: true
});

fastify.register(require('@fastify/cors'), {
	origin: '*'
});

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let startDate = Date.now();

const rootDir = 'analyses';
const sourcesSubdir = 'sources';

const writeSourceCode = async (contractId) => {

	if (!await existsAsync(rootDir)) await makeDirAsync(rootDir);

	const res = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractId}`);
	const data = await res.json();

	console.log(data);

	const sources = data.result[0].SourceCode.startsWith('{{') ? JSON.parse(data.result[0].SourceCode.slice(1, -1)).sources : {
		'main.sol': {
			content: data.result[0].SourceCode
		}
	};
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

	const mainFile = Object.keys(sources)[0];
	await writeFileAsync(join(rootDir, contractId, 'main.txt'), mainFile, 'utf-8');

	return mainFile;
};

const generateAuditReport = async (contractId) => {

	const analyze = async () => {
		const analysis = require(join(__dirname, rootDir, contractId, 'analysis.json'));
		const mainFileName = await fs.readFileSync(join(__dirname, rootDir, contractId, 'main.txt'), 'utf-8');
		const mainFileContent = await fs.readFileSync(join(__dirname, rootDir, contractId, sourcesSubdir, mainFileName), 'utf-8');
        
		const maxSuggestionCount = 2;
		const highDetectors = analysis.results.detectors.filter((detector) => (detector.confidence === 'High' || detector.confidence === 'Medium') && (detector.impact === 'Medium' || detector.impact === 'High' || detector.impact === 'Low')).slice(0, maxSuggestionCount);
		const systemChatGptPrompt = 'You are a AI robot designed to help to generate fixes for smart contracts. You will receive a function, an error, and always need to suggest an alternative code that works.\n\nYou must always trust the error and never question it in your explanation. Fix type must be \'contract security\', \'trading security\', \'bugs/logic issues\' or \'optimization recommendations\'. Your answer should be in the EXACT following format (re-send the whole function and follow the same prettier rules so we can show a code diff with your fixes, explained fix is max 320 characters).\n\nAlternative code:\n```solidity\n[replace with code]\n```\n\nExplained fix:\n```\n[replace with explanations]\n\n```Fix type:\n```\n[replace with fix type]\n```';

		const suggestions = [];

		for (let detector of highDetectors) {
			const detectedFunction = detector.elements.find((element) => element.type === 'function');
			const detectedFunctionContent = mainFileContent.slice(detectedFunction.source_mapping.start, detectedFunction.source_mapping.start + detectedFunction.source_mapping.length);
			console.log(detectedFunctionContent);

			const completion = await openai.createChatCompletion({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: systemChatGptPrompt
					},
					{
						role: 'user',
						content: `Function to analyze:\n\`\`\`solidity\n${detectedFunctionContent}\n\`\`\`\n\nError:\n\`\`\`${detector.description}\n\`\`\``
					}
				]
			});

			const response = completion.data.choices[0].message;
			console.log(response.content);
			const fixedCode = response.content.match(/Alternative code:\n```solidity([\s\S.]*?)```/)[1].trim();
			const explanation = response.content.match(/Explained fix:\n```([\s\S.]*?)```/)[1].trim();
			const fixType = response.content.match(/Fix type:\n```([\s\S.]*?)```/)[1].trim();

			console.log(fixedCode);
			console.log(explanation);

			suggestions.push({
				content: explanation,
				codes: [detectedFunctionContent, fixedCode],
				fixType
			});
		}

		const tokenRes = await fetch(`https://dapp.herokuapp.com/token-audit?contract=${contractId}`);
		const tokenData = await tokenRes.json();
        
		const existingPdfBytes = fs.readFileSync('./template.pdf');
		const pdfDoc = await PDFDocument.load(existingPdfBytes);
		const pages = pdfDoc.getPages();

		pdfDoc.registerFontkit(fontkit);

		const obudaBoldFontBytes = fs.readFileSync('./fonts/obuda-bold.otf');
		const obudaBoldFont = await pdfDoc.embedFont(obudaBoldFontBytes);

		const obudaFontBytes = fs.readFileSync('./fonts/Montserrat-Thin.ttf');
		const obudaFont = await pdfDoc.embedFont(obudaFontBytes);

		const topOfPage = 650;
		const margin = 80;

		let lastSuggestionEndedAt = topOfPage - 10;

		const annots = [];

		pages[0].drawText(tokenData.token_name, {
			size: 18,
			x: 160,
			y: 301,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont
		});
    
		pages[0].drawText(tokenData.token_symbol, {
			size: 18,
			x: 180,
			y: 262,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont
		});
    
		pages[0].drawText(contractId, {
			size: 12,
			x: 270,
			y: 223,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont
		});

		const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
			if (!acc[suggestion.fixType]) acc[suggestion.fixType] = [];
			acc[suggestion.fixType].push(suggestion);
			return acc;
		}, {});

		const pagePerFixType = {
			'contract security': 2,
			'trading security': 3,
			'bugs/logic issues': 4,
			'optimization recommendations': 5
		};

		for (let fixType of Object.keys(groupedSuggestions)) {

			for (let i = 0; i < groupedSuggestions[fixType].length; i++) {

				console.log(fixType, i, pagePerFixType[fixType]);

				pages[pagePerFixType[fixType]].drawText(`Detection #${i+1}`, {
					size: 20,
					x: margin,
					y: lastSuggestionEndedAt - 40,
					maxWidth: 400,
					lineHeight: 12,
					font: obudaBoldFont,
					color: rgb(...[0, 24, 122].map((e) => e / 255))
				});
				lastSuggestionEndedAt = lastSuggestionEndedAt - 40;

				pages[pagePerFixType[fixType]].drawText(groupedSuggestions[fixType][i].content, {
					size: 10,
					x: margin,
					y: lastSuggestionEndedAt - 30,
					maxWidth: 400,
					lineHeight: 12,
					font: obudaFont
				});
				lastSuggestionEndedAt = lastSuggestionEndedAt - 30;

				const lines = breakTextIntoLines(groupedSuggestions[fixType][i].content, [' '], 400, (text) => obudaBoldFont.widthOfTextAtSize(text, 10));
				const contentSize = lines.length * 14;

				pages[pagePerFixType[fixType]].drawText('Click here for code changes', {
					size: 15,
					x: margin,
					y: lastSuggestionEndedAt - 10 - contentSize,
					maxWidth: 400,
					lineHeight: 12,
					font: obudaBoldFont
				});

				const diff = dmp.diff_main(groupedSuggestions[fixType][i].codes[0], groupedSuggestions[fixType][i].codes[1]);
				const gzip = Buffer.from(
					pako.gzip(
						JSON.stringify({ diff, lhsLabel: 'previous_code.sol', rhsLabel: 'ai_fixed_code.sol' }))
				).toString('base64');

				const pdfUrlDict = pdfDoc.context.obj({
					Type: 'Annot',
					Subtype: 'Link',
					Rect: [margin - 5, lastSuggestionEndedAt - 10 - contentSize + 15, 300, lastSuggestionEndedAt - 10 - contentSize + 5 - 15],
					A: {
						Type: 'Action',
						S: 'URI',
						URI: PDFString.of(`https://diffviewer.vercel.app/v1/diff#${gzip}`),
					}
				});
				annots.push(pdfDoc.context.register(pdfUrlDict));

				lastSuggestionEndedAt = lastSuggestionEndedAt - 10 - contentSize;
				lastSuggestionEndedAt = lastSuggestionEndedAt - 10;

			}

			pages[pagePerFixType[fixType]].node.set(PDFName.of('Annots'), pdfDoc.context.obj(annots));
            
			const pdfBytes = await pdfDoc.save();

			return pdfBytes;
		}
	};

	if (!await existsAsync(rootDir)) await makeDirAsync(rootDir);
	if (await existsAsync(join(rootDir, contractId))) return analyze();

	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve) => {
		const mainFile = await writeSourceCode(contractId);

		const watcher = chokidar.watch(join(rootDir, contractId));

		watcher.on('add', (path) => {
			if (path === join(rootDir, contractId, 'analysis.json')) {
				console.log(`analysis.json created in ${Date.now() - startDate}ms`);
				watcher.close();
				resolve(analyze());
			}
		});

		childProcess.spawn('slither', [mainFile, '--json', `${join('..', 'analysis')}.json`], {
			cwd: join(rootDir, contractId, sourcesSubdir)
		});

	});

};

// generateAuditReport(_contractId).then((pdf) => {
//     fs.writeFile('audit.pdf', pdf, (err) => {
//         if (err) throw err;
//         console.log('The file has been saved!');
//     });
// })

fastify.listen({
	port: 3000
}, (err, address) => {
	if (err) throw err;
	console.log(`server listening on ${address}`);
});
