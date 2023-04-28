require('dotenv').config();

const { triggerAuditReport } = require('./auditor');
const { redisClient } = require('./redis');
const { existsAsync, readFileAsync, rmAsync } = require('./util');
const { join } = require('path');

const fastify = require('fastify')();

fastify.register(require('@fastify/cors'), {
	origin: '*'
});

fastify.post('/audit/:contractId', async (request, reply) => {

	const { contractId } = request.params;

	const outputExists = await existsAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));

	if (outputExists) {
		return reply.send({ status: 'ended' });
	}

	const info = await redisClient.info('keyspace');
	const lines = info.split('\n');
	let count = 0;
	for (let line of lines) {
		if (line.startsWith(`db${process.env.REDIS_DB}`)) {
			count = parseInt(line.split('=')[1].split(',')[0]);
			break;
		}
	}

	if (count > 2) {
		return reply.send({ error: 'server is busy' });
	}

	triggerAuditReport(contractId);
    
	reply.send({ status: 'started' });
});

fastify.get('/audit/:contractId/status', async (request, reply) => {

	const { contractId } = request.params;

	const outputExists = await existsAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));

	if (outputExists) {
		return reply.send({ status: 'ended' });
	}

	const status = await redisClient.get(contractId);
    
	reply.send({ status: status || 'unknown' });
});

fastify.get('/audit/:contractId/pdf', async (request, reply) => {

	const { contractId } = request.params;

	const outputExists = await existsAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));
	if (!outputExists) {
		return reply.send({ error: 'unknown' });
	}

	const pdfBytes = await readFileAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));
    
	reply.send({
		status: 'success',
		pdf: pdfBytes.toString('base64')
	});
});

fastify.post('/audit/:contractId/reset/:key', async (request, reply) => {

	const { contractId, key } = request.params;

	if (key !== process.env.RESET_KEY) {
		return reply.send({ status: 'invalid password key' });
	}

	if (contractId === 'all') {
		rmAsync(process.env.REPORTS_ROOT_DIR, { recursive: true });
	} else {
		rmAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));
	}

	reply.send({ status: 'success' });

});

fastify.listen({
	port: process.env.API_PORT,
	host: process.env.API_HOST
}, (err, address) => {
	if (err) throw err;
	console.log(`server listening on ${address}`);
});
