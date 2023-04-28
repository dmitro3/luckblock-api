const { join } = require('path');
const { readFileAsync, writeFileAsync } = require('../util');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = async function (contractId) {

	const analysis = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'analysis.json'));
	const mainFileName = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'main.txt'), 'utf-8');
	const mainFileContent = await readFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'sources', mainFileName), 'utf-8');
    
	const maxSuggestionCount = 2;
	const acceptedConfidences = ['High', 'Medium'];
	const acceptedImpacts = ['High', 'Medium', 'Low'];
	const highDetectors = analysis.results.detectors
		.filter((detector) => acceptedConfidences.includes(detector.confidence) && acceptedImpacts.includes(detector.impact))
		.slice(0, maxSuggestionCount);

	const systemChatGptPrompt = await readFileAsync(join('chatgpt-prompt.txt'), 'utf-8');

	const suggestions = [];

	for (let detector of highDetectors) {
		const detectedFunction = detector.elements.find((element) => element.type === 'function');
		const detectedFunctionContent = mainFileContent.slice(detectedFunction.source_mapping.start, detectedFunction.source_mapping.start + detectedFunction.source_mapping.length);

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

		const fixedCode = response.content.match(/Alternative code:\n```solidity([\s\S.]*?)```/)[1].trim();
		const explanation = response.content.match(/Explained fix:\n```([\s\S.]*?)```/)[1].trim();
		const fixType = response.content.match(/Fix type:\n```([\s\S.]*?)```/)[1].trim();

		suggestions.push({
			content: explanation,
			codes: [detectedFunctionContent, fixedCode],
			fixType,
			impact: detector.impact,
			confidence: detector.confidence
		});
	}

	await writeFileAsync(join(process.env.TMP_ROOT_DIR, contractId, 'suggestions.json'), JSON.stringify(suggestions, null, 4), 'utf-8');

	return contractId;

};
