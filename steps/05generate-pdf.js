const { writeFileAsync, readFileAsync } = require('../util');
const { join } = require('path');
const { PDFDocument, breakTextIntoLines, rgb, PDFString, PDFName } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();
const pako = require('pako');
const { nextStep } = require('../redis');

module.exports = async function (contractId) {

	nextStep(contractId, 'Generating PDF output...');

	const extraTokenAuditDataContent = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'token-audit.json'), 'utf-8');
	const suggestionsContent = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'suggestions.json'), 'utf-8');

	const tokenAuditData = JSON.parse(extraTokenAuditDataContent);
	const suggestions = JSON.parse(suggestionsContent);
        
	const existingPdfBytes = await readFileAsync('./template.pdf');
	const pdfDoc = await PDFDocument.load(existingPdfBytes);
	const pages = pdfDoc.getPages();

	pdfDoc.registerFontkit(fontkit);

	const obudaBoldFontBytes = await readFileAsync('./fonts/obuda-bold.otf');
	const obudaBoldFont = await pdfDoc.embedFont(obudaBoldFontBytes);

	const obudaFontBytes = await readFileAsync('./fonts/Montserrat-Thin.ttf');
	const obudaFont = await pdfDoc.embedFont(obudaFontBytes);

	const topOfPage = 650;
	const margin = 80;

	let lastSuggestionEndedAt = topOfPage - 10;

	const annots = [];

	pages[0].drawText(tokenAuditData.token_name, {
		size: 18,
		x: 160,
		y: 301,
		maxWidth: 400,
		lineHeight: 12,
		font: obudaBoldFont
	});
    
	pages[0].drawText(tokenAuditData.token_symbol, {
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

	const pagePerFixType = {
		'bugs/logic issues': 4,
		'optimization recommendations': 5
	};

	const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
		if (!pagePerFixType[suggestion.fixType]) suggestion.fixType = 'bugs/logic issues';
		if (!acc[suggestion.fixType]) acc[suggestion.fixType] = [];
		acc[suggestion.fixType].push(suggestion);
		return acc;
	}, {});

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
            
		await writeFileAsync(join('reports', `${contractId}.pdf`), pdfBytes);

		return contractId;
	}

};
