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

describe('testing contracts', () => {

	const contractIds = ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2','0xdac17f958d2ee523a2206206994597c13d831ec7','0x6982508145454ce325ddbe47a25d4ec3d2311933','0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48','0x06450dee7fd2fb8e39061434babcfc05599a6fb8','0xa35923162c49cf95e6bf26623385eb431ad920d3','0x4f06229a42e344b361d8dc9ca58d73e2597a9f1f','0x1ce270557c1f68cfb577b856766310bf8b47fd9c','0xecbee2fae67709f718426ddc3bf770b26b95ed20','0x58b6a8a3302369daec383334672404ee733ab239','0xb05d618d2142158e200f463810f1b7eb26a3f225','0x5026f006b85729a8b14553fae6af249ad16c9aab','0x7d8146cf21e8d7cbe46054e01588207b51198729','0x0000000000a39bb272e79075ade125fd351887ac','0xcf117403474eeac230daccb3b54c0dabeb94ae22','0x0414d8c87b271266a5864329fb4932bbe19c0c49','0xb69753c06bb5c366be51e73bfc0cc2e3dc07e371','0x15f20f9dfdf96ccf6ac96653b7c0abfe4a9c9f0f','0x6b175474e89094c44da98b954eedeac495271d0f','0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce','0x4d224452801aced8b2f0aebe155379bb5d594381','0xb794ad95317f75c44090f64955954c3849315ffe','0x90376a63529adc56397c8d40d650f3b60c890cf8','0x15d4c048f83bd7e37d49ea4c83a07267ec4203da','0x2b591e99afe9f32eaa6214f7b7629768c40eeb39','0x385f555fab6c60cdae3e42ce594bcae0fe6924f0','0x3d2b66bc4f9d6388bd2d97b95b565be1686aefb3','0x70c78fc35ae0756ca95bb3d95016edefbda8a6a4','0xa9e8acf069c58aec8825542845fd754e41a9489a','0x25722cd432d02895d9be45f5deb60fc479c8781e','0x2c95d751da37a5c1d9c5a7fd465c1d50f3d96160','0xaada04204e9e1099daf67cf3d5d137e84e41cf41','0xe0a458bf4acf353cb45e211281a334bb1d837885','0x18cc2ba8995c6307e355726244adb023cf00522f','0x9f5f463a7666e04cdabd22bd83569a5c72cb4f4d','0xab306326bc72c2335bd08f42cbec383691ef8446','0x514910771af9ca656af840dff83e8264ecf986ca','0x5888641e3e6cbea6d84ba81edb217bd691d3be38','0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0','0x2260fac5e5542a773aa44fbcfedf7c193bc2c599','0xe46091dce9c67691bcf22768bbee0bc9e20d4beb','0x378e1be15be6d6d1f23cfe7090b6a77660dbf14d','0xa589d8868607b8d79ee4288ce192796051263b64','0xc7033e9a101f11233fc9469f48882f9d958b5bf6','0x5c2975269e74cb3a8514e5b800a1e66c694d4df8','0x14d4c7a788908fbbbd3c1a4bac4aff86fe1573eb','0xdb2c75dd52f379baf279d3e603d2d4df0d5c9c1a','0x7bdf3ff2513a4f467bc25b7fd4b8404ad8126cb3','0xcf0c122c6b73ff809c693db761e7baebe62b6a2e','0x5c559f3ee9a81da83e069c0093471cb05d84052a'];

	contractIds.forEach((contractId) => {

		it(contractId, () => {

			return cleanUp(contractId)
				.then(extraAudit)
				.then(downloadSourceCode)
				.then(runSlither)
				.then((contractIdFinal) => {
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
