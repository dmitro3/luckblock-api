const [ cleanUp, downloadSourceCode, runSlither ] = [
    require('../../steps/00cleanup'),
    require('../../steps/01download-source-code'),
    require('../../steps/02run-slither')
];

const dotenv = require('dotenv');
dotenv.config();

process.env.NODE_ENV = 'test';

describe('testing contracts', () => {

    const contractIds = [
        '0xD4AF909fCd595596c89DCa8C62aB4B7C721B843E',
        '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e'
    ];

    contractIds.forEach((contractId) => {

        it(contractId, () => {

            return cleanUp(contractId)
                .then(downloadSourceCode)
                .then(runSlither)
                .then((contractIdFinal) => {
                    expect(contractIdFinal).toBe(contractId);
                });
            
        }, 20000);

    });

});
