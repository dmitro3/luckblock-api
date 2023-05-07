/* eslint-disable no-undef */

const [ cleanUp, extraAudit, downloadSourceCode, runSlither ] = [
	require('../../steps/00cleanup'),
	require('../../steps/01extra-audit'),
	require('../../steps/02download-source-code'),
	require('../../steps/03run-slither')
];

const dotenv = require('dotenv');
dotenv.config();

process.env.NODE_ENV = 'test';
//rocess.env.NODE_ENV = 'superdebug';

describe('testing contracts', () => {

	const contractIds = ['0x9cbf044bc535db4c93a9f11205a69631d9dcef26','0x9d90669665607f08005cae4a7098143f554c59ef','0x49642110b712c1fd7261bc074105e9e44676c68f','0xda7c0810ce6f8329786160bb3d1734cf6661ca6e','0xf8fc4f865d05d6b622aecc08f4d595c92f205c1b','0x6c4c193bff0a117f0c2b516802abba961a1eeb12','0xe1ec350ea16d1ddaff57f31387b2d9708eb7ce28','0xd87d72248093597df8d56d2a53c1ab7c1a0cc8da','0x3819f64f282bf135d62168c1e513280daf905e06','0xad1a5b8538a866ecd56ddd328b50ed57ced5d936','0x9980b3aa61114b07a7604ffdc7c7d04bb6d8d735','0x9813037ee2218799597d83d4a5b6f3b6778218d9','0x666cbfaa3baa2faccfac8854fea1e5db140fb104','-','0x9b0c67713790ae6cc68fad9ee59eb14456649249','0x471a202f69d6e975da55e363dab1bdb2e86e0c0f','0xeb08c8d2a8818cef2a50d0fc9218aafbb0862495','0xe19f85c920b572ca48942315b06d6cac86585c87','0xd953af4e584178f7a69c4afb3a60502d33dc544e','0x9be776559fed779cabd67042a7b8987aae592541','0xaca55d5a5f58e29bd1e00e4b1bdeda62d2ecf33f','0xae7ab96520de3a18e5e111b5eaab095312d7fe84','0xc30d724e3e370dfcec3b5705ce4af2b23d6e2e49','0xd533a949740bb3306d119cc777fa900ba034cd52','0x440aeca896009f006eea3df4ba3a236ee8d57d36','0xadf7ea49578344cd738e3ce87485067485c3e4ff','0xd8e163967fed76806df0097b704ba721b9b37656','0x94b6d485ad62c6bfb5aedafa0ced89f04d155db1','0x8484e645a054586a6d6af60c0ee911d7b5180e64','0x0615dbba33fe61a31c7ed131bda6655ed76748b1','0x8442e0e292186854bb6875b2a0fc1308b9ded793','0x184da821bd956cafc598dcb4fa9b8e040c45ada1','0x433117819df60cb943ec57fbc885c894c5602e1e','0xf0f9d895aca5c8678f706fb8216fa22957685a13','0x4a220e6096b25eadb88358cb44068a3248254675','0x3d9c4f54fa15df70f8895fbe6c8b0f5e85af059c','0x6b89b97169a797d94f057f4a0b01e2ca303155e4','0x3f7d1c62a8456893c0f55c13e3b5993d2f68287a','0x92bff7c7e1c5191404ac5d78580ef1818fa16d62','0xcb72f1e016df2a7efffd25704b1648075f37796d','0x049715c70fdbdd2be4814f76a53dc3d6f4367756','0x2c91d908e9fab2dd2441532a04182d791e590f2d','0x1f9840a85d5af5bf1d1762f925bdaddc4201f984','0x31c8eacbffdd875c74b94b077895bd78cf1e64a3','0x5283d291dbcf85356a21ba090e6db59121208b44','0x7345577fc896952426922dd886db641a4fe13387','0x3067eac379424de51060efcba2799257bbd66956','0xb08686f3bf55a1ea172542d161a63350baf9e219','0x081155930f35bf383864d50c17cc3b92f3c1ad3d','0x8e235f491ae66b82296d58332adc2a021c449c10'];

	//const contractIds = ['0x8484e645a054586a6d6af60c0ee911d7b5180e64', '0xd533a949740bb3306d119cc777fa900ba034cd52', '0x9be776559fed779cabd67042a7b8987aae592541'];

	contractIds.forEach((contractId) => {

		it(contractId, () => {

			return cleanUp(contractId)
				.then(extraAudit)
				.then(downloadSourceCode)
				.then(runSlither)
				.then(([contractIdFinal, data]) => {

					expect(data?.functionNames?.length).toBeGreaterThan(4);

					expect(contractIdFinal)
						.withContext('unknown error')
						.toBe(contractId);
				})
				.catch((err) => {
					throw err;
				});
            
		}, 20000);

	});

});
