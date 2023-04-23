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

const { PDFDocument, PDFFont, PDFName, PDFString, rgb, breakTextIntoLines } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();
const pako = require('pako');

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    const mainFile = Object.keys(sources)[0];
    await writeFileAsync(join(rootDir, contractId, 'main.txt'), mainFile, 'utf-8');

    return mainFile;
};

const generateAuditReport = async (contractId) => {

    const analyze = async () => {
        const analysis = require(join(__dirname, rootDir, contractId, 'analysis.json'));
        const mainFileName = await fs.readFileSync(join(__dirname, rootDir, contractId, 'main.txt'), 'utf-8');
        const mainFileContent = await fs.readFileSync(join(__dirname, rootDir, contractId, sourcesSubdir, mainFileName), 'utf-8');
        
        const highDetectors = analysis.results.detectors.filter((detector) => (detector.confidence === 'High' || detector.confidence === 'Medium') && detector.impact === 'Medium');
        const systemChatGptPrompt = "You are a AI robot designed to help to generate fixes for smart contracts. You will receive a function, an error, and always need to suggest an alternative code that works.\n\nYou must always trust the error and never question it in your explanation. Fix type must be 'contract security', 'trading security', 'bugs/logic issues' or 'optimization recommendations'. Your answer should be in the EXACT following format (re-send the whole function and follow the same prettier rules so we can show a code diff with your fixes, explained fix is max 320 characters).\n\nAlternative code:\n```solidity\n[replace with code]\n```\n\nExplained fix:\n```\n[replace with explanations]\n\n```Fix type:\n```\n[replace with fix type]\n```";

        const suggestions = [];

        for (let detector of highDetectors) {
            const detectedFunction = detector.elements.find((element) => element.type === 'function');
            const detectedFunctionContent = mainFileContent.slice(detectedFunction.source_mapping.start, detectedFunction.source_mapping.start + detectedFunction.source_mapping.length);
            console.log(detectedFunctionContent)

            const completion = await openai.createChatCompletion({
                model: "gpt-4",
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
            const fixedCode = response.content.match(/Alternative code:\n```solidity([\s\S.]*?)```/)[1];
            const explanation = response.content.match(/Explained fix:\n```([\s\S.]*?)```/)[1];
            const fixType = response.content.match(/Fix type:\n```([\s\S.]*?)```/)[1];

            console.log(fixedCode);
            console.log(explanation);

            suggestions.push({
                content: explanation,
                codes: [detectedFunctionContent, fixedCode],
                fixType
            });
        }
        
        const existingPdfBytes = fs.readFileSync('./template.pdf')
        const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const pages = pdfDoc.getPages()

        pdfDoc.registerFontkit(fontkit)

        const obudaBoldFontBytes = fs.readFileSync('./fonts/obuda-bold.otf')
        const obudaBoldFont = await pdfDoc.embedFont(obudaBoldFontBytes)

        const obudaFontBytes = fs.readFileSync('./fonts/Montserrat-Thin.ttf')
        const obudaFont = await pdfDoc.embedFont(obudaFontBytes)

        const topOfPage = 650;
        const margin = 80;

        let lastSuggestionEndedAt = topOfPage;

        const annots = [];

        for (let i = 0; i < suggestions.length; i++) {

            pages[2].drawText(`Detection #${i+1}`, {
                size: 20,
                x: margin,
                y: lastSuggestionEndedAt - 40,
                maxWidth: 400,
                lineHeight: 12,
                font: obudaBoldFont,
                color: rgb(...[0, 24, 122].map((e) => e / 255))
            });
            lastSuggestionEndedAt = lastSuggestionEndedAt - 40;

            pages[2].drawText(suggestions[i].content, {
                size: 10,
                x: margin,
                y: lastSuggestionEndedAt - 30,
                maxWidth: 400,
                lineHeight: 12,
                font: obudaFont
            });
            lastSuggestionEndedAt = lastSuggestionEndedAt - 30;

            const lines = breakTextIntoLines(suggestions[i].content, [' '], 400, (text) => obudaBoldFont.widthOfTextAtSize(text, 10));
            const contentSize = lines.length * 14;

            pages[2].drawText('Click here for code changes', {
                size: 15,
                x: margin,
                y: lastSuggestionEndedAt - 10 - contentSize,
                maxWidth: 400,
                lineHeight: 12,
                font: obudaBoldFont
            });

            const diff = dmp.diff_main(suggestions[i].codes[0], suggestions[i].codes[1]);
            const gzip = Buffer.from(
                pako.gzip(
                JSON.stringify({ diff, lhsLabel: 'previous_code.sol', rhsLabel: 'ai_fixed_code.sol' }))
            ).toString('base64');

            const pdfUrlDict = pdfDoc.context.obj({
                Type: "Annot",
                Subtype: "Link",
                Rect: [margin - 5, lastSuggestionEndedAt - 10 - contentSize + 15, 300, lastSuggestionEndedAt - 10 - contentSize + 5 - 15],
                A: {
                    Type: "Action",
                    S: "URI",
                    URI: PDFString.of(`https://diffviewer.vercel.app/v1/diff#${gzip}`),
                }
            });
            annots.push(pdfDoc.context.register(pdfUrlDict));

            lastSuggestionEndedAt = lastSuggestionEndedAt - 10 - contentSize;
            lastSuggestionEndedAt = lastSuggestionEndedAt - 10;

        }

        pages[2].node.set(PDFName.of("Annots"), pdfDoc.context.obj(annots));
        
        const pdfBytes = await pdfDoc.save();

        return pdfBytes;
    }

    if (!await existsAsync(rootDir)) await makeDirAsync(rootDir);
    console.log(join(rootDir, contractId))
    if (await existsAsync(join(rootDir, contractId))) return analyze();

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

        childProcess.spawn(`slither`, [mainFile, `--json`, `${join('..', 'analysis')}.json`], {
            cwd: join(rootDir, contractId, sourcesSubdir)
        });

    });

}

generateAuditReport(_contractId).then((pdf) => {
    fs.writeFile('audit.pdf', pdf, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
})