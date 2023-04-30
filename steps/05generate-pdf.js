const { writeFileAsync, readFileAsync, existsAsync, makeDirAsync } = require('../util');
const { join } = require('path');
const { PDFDocument, breakTextIntoLines, rgb, PDFString, PDFName } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();
const { nextStep } = require('../cache');
const { addCodeDiff } = require('../postgres');

module.exports = async function (contractId) {

	nextStep(contractId, 'Generating PDF output...');

	if (!await existsAsync(process.env.REPORTS_ROOT_DIR)) await makeDirAsync(process.env.REPORTS_ROOT_DIR);

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


	for (let i = 0; i < suggestions.length; i++) {

		pages[4].drawText(`Detection #${i+1}`, {
			size: 20,
			x: margin,
			y: lastSuggestionEndedAt - 40,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont,
			color: rgb(...[0, 24, 122].map((e) => e / 255))
		});
		lastSuggestionEndedAt = lastSuggestionEndedAt - 40;

		pages[4].drawText(suggestions[i].content, {
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

		pages[4].drawText('Click here for code changes', {
			size: 15,
			x: margin,
			y: lastSuggestionEndedAt - 10 - contentSize,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont
		});

		const diff = dmp.diff_main(suggestions[i].codes[0], suggestions[i].codes[1]);

		const randomId = Math.random().toString(36).substring(2, 15);
		addCodeDiff(contractId, JSON.stringify({ diff, lhsLabel: 'previous_code.sol', rhsLabel: 'ai_fixed_code.sol' }), randomId);

		const pdfUrlDict = pdfDoc.context.obj({
			Type: 'Annot',
			Subtype: 'Link',
			Rect: [margin - 5, lastSuggestionEndedAt - 10 - contentSize + 15, 300, lastSuggestionEndedAt - 10 - contentSize + 5 - 15],
			A: {
				Type: 'Action',
				S: 'URI',
				URI: PDFString.of(`https://miyamoto-diff-viewer.vercel.app/v1/diff#${randomId}`),
			}
		});
		annots.push(pdfDoc.context.register(pdfUrlDict));

		lastSuggestionEndedAt = lastSuggestionEndedAt - 10 - contentSize;
		lastSuggestionEndedAt = lastSuggestionEndedAt - 10;

	}

	pages[4].node.set(PDFName.of('Annots'), pdfDoc.context.obj(annots));

	const formatBoolean = (string) => string === '0' ? 'No' : 'Yes';
	const isTrue = (string) => string !== '0';

	const properties1 = [
		{
			label: 'Self destruct',
			value: formatBoolean(tokenAuditData.selfdestruct),
			isGreen: !isTrue(tokenAuditData.selfdestruct)
		},
		{
			label: 'External call risk',
			value: formatBoolean(tokenAuditData.external_call),
			isGreen: !isTrue(tokenAuditData.external_call)
		},
		{
			label: 'Buy available',
			value: formatBoolean(!tokenAuditData.cannot_buy),
			isGreen: !isTrue(!tokenAuditData.cannot_buy)
		},
		{
			label: 'Max sell ratio',
			value: formatBoolean(tokenAuditData.cannot_sell_all),
			isGreen: isTrue(tokenAuditData.cannot_sell_all)
		},
		{
			label: 'Tax modifiable',
			value: formatBoolean(tokenAuditData.slippage_modifiable),
			isGreen: !isTrue(tokenAuditData.slippage_modifiable)
		},
		{
			label: 'Transfer pausable',
			value: formatBoolean(tokenAuditData.transfer_pausable),
			isGreen: !isTrue(tokenAuditData.transfer_pausable)
		},
		{
			label: 'Blacklisted',
			value: formatBoolean(tokenAuditData.is_blacklisted),
			isGreen: !isTrue(tokenAuditData.is_blacklisted)
		},
		{
			label: 'Trading cooldown',
			value: formatBoolean(tokenAuditData.trading_cooldown),
			isGreen: !isTrue(tokenAuditData.trading_cooldown)
		},
		{
			label: 'Personal tax modifiable',
			value: formatBoolean(tokenAuditData.personal_slippage_modifiable),
			isGreen: !isTrue(tokenAuditData.personal_slippage_modifiable)
		}
	];

	const properties2 = [
		{
			label: 'Contract verified',
			value: formatBoolean(tokenAuditData.is_open_source),
			isGreen: isTrue(tokenAuditData.is_open_source)
		},
		{
			label: 'Honeypot',
			value: formatBoolean(tokenAuditData.is_honeypot),
			isGreen: !isTrue(tokenAuditData.is_honeypot)
		},
		{
			label: 'Buy tax',
			value: tokenAuditData.buy_tax + '%',
			isGreen: false
		},
		{
			label: 'Sell tax',
			value: tokenAuditData.sell_tax + '%',
			isGreen: false
		},
		{
			label: 'Proxy contract',
			value: formatBoolean(tokenAuditData.is_proxy),
			isGreen: !isTrue(tokenAuditData.is_proxy)
		},
		{
			label: 'Mintable',
			value: formatBoolean(tokenAuditData.is_mintable),
			isGreen: !isTrue(tokenAuditData.is_mintable)
		},
		{
			label: 'Retrieve ownership',
			value: formatBoolean(tokenAuditData.can_take_back_ownership),
			isGreen: !isTrue(tokenAuditData.can_take_back_ownership)
		},
		{
			label: 'Balance modifiable',
			value: formatBoolean(tokenAuditData.owner_change_balance),
			isGreen: !isTrue(tokenAuditData.owner_change_balance)
		},
		{
			label: 'Hidden owner',
			value: formatBoolean(tokenAuditData.hidden_owner),
			isGreen: !isTrue(tokenAuditData.hidden_owner)
		}
	];

	for (let i = 0; i < properties1.length; i++) {
		pages[2].drawText(properties1[i].label, {
			size: 20,
			x: margin,
			y: topOfPage - 50 - i*60,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont,
		});
		pages[2].drawText(properties1[i].value, {
			size: 12,
			x: margin + 10,
			y: topOfPage - 50 - i*60 - 20,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont,
			color: properties1[i].isGreen ? rgb(...[0, 128, 0].map((e) => e / 255)) : rgb(...[255, 0, 0].map((e) => e / 255))
		});
	}

	for (let i = 0; i < properties2.length; i++) {
		pages[3].drawText(properties2[i].label, {
			size: 20,
			x: margin,
			y: topOfPage - 50 - i*60,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont,
		});
		pages[3].drawText(properties2[i].value, {
			size: 12,
			x: margin + 10,
			y: topOfPage - 50 - i*60 - 20,
			maxWidth: 400,
			lineHeight: 12,
			font: obudaBoldFont,
			color: properties2[i].isGreen ? rgb(...[0, 128, 0].map((e) => e / 255)) : rgb(...[255, 0, 0].map((e) => e / 255))
		});
	}
		
	const pdfBytes = await pdfDoc.save();
		
	await writeFileAsync(join('reports', `${contractId}.pdf`), pdfBytes);

	return contractId;

};
