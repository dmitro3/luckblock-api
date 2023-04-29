const { join } = require('path');
const { readFileAsync, writeFileAsync } = require('../util');
const { Configuration, OpenAIApi } = require('openai');
const { debugInfo, nextStep } = require('../redis');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getSuggestion = async (contractId, mainFileContent, systemChatGptPrompt, detector) => {

	const detectedFunction = detector.elements.find((element) => element.type === 'function');
	if (!detectedFunction) return null;
	const detectedFunctionContent = mainFileContent.slice(detectedFunction.source_mapping.start, detectedFunction.source_mapping.start + detectedFunction.source_mapping.length);

	const messages = [
		{
			role: 'system',
			content: systemChatGptPrompt
		},
		{
			role: 'user',
			content: `Function to analyze:\n\`\`\`solidity\n${detectedFunctionContent}\n\`\`\`\n\nError:\n\`\`\`${detector.description}\n\`\`\``
		}
	];

	const length = messages.map((message) => message.content).join('\n').length;

	debugInfo(contractId, `ChatGPT prompt length: ${length} characters`);

	const completion = await openai.createChatCompletion({
		model: 'gpt-4',
		messages
	});

	const response = completion.data.choices[0].message;

	const fixedCode = response.content.match(/Alternative code:\n```solidity([\s\S.]*?)```/)[1].trim();
	const explanation = response.content.match(/Explained fix:\n```([\s\S.]*?)```/)[1].trim();

	return {
		content: explanation,
		codes: [detectedFunctionContent, fixedCode],
		impact: detector.impact,
		confidence: detector.confidence
	};

};

module.exports = async function (contractId) {

	nextStep(contractId, 'Our AI is generating suggestions...');

	const analysis = JSON.parse(await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'analysis.json'), 'utf-8'));
	const mainFileName = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'main.txt'), 'utf-8');
	const mainFileContent = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources', mainFileName), 'utf-8');
    
	const maxSuggestionCount = 4;
	const acceptedConfidences = ['High', 'Medium'];
	const acceptedImpacts = ['High', 'Medium', 'Low'];
	const highDetectors = analysis.results.detectors
		.filter((detector) => acceptedConfidences.includes(detector.confidence) && acceptedImpacts.includes(detector.impact))
		.slice(0, maxSuggestionCount);

	const systemChatGptPrompt = await readFileAsync(join('chatgpt-prompt.txt'), 'utf-8');

	const suggestions = (await Promise.all(highDetectors.map(async (detector) => {
		return await getSuggestion(contractId, mainFileContent, systemChatGptPrompt, detector);
	}))).filter(Boolean);

	await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'suggestions.json'), JSON.stringify(suggestions, null, 4), 'utf-8');

	return contractId;

};
