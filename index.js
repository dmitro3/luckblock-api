require('dotenv').config();

const { triggerAuditReport } = require('./auditor');
const { redisClient } = require('./redis');
const { existsAsync, readFileAsync } = require('./util');
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
	const db0Keys = parseInt(info.split('\n')[1].substring('db0:keys='.length).split(',')[0]);

	if (db0Keys > 0) {
		return reply.send({ error: 'server is busy' });
	}

	triggerAuditReport(contractId);
    
	reply.send({ status: 'started' });
});

fastify.get('/audit/:contractId/status', async (request, reply) => {

	const { contractId } = request.params;

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

fastify.listen({
	port: process.env.API_PORT
}, (err, address) => {
	if (err) throw err;
	console.log(`server listening on ${address}`);
});
