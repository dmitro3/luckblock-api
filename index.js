require('dotenv').config();

const { triggerAuditReport } = require('./auditor');
const { getCodeDiff } = require('./postgres');
let { pending, startsAt, errors } = require('./cache');
const { existsAsync, readFileAsync, rmAsync } = require('./util');
const { join } = require('path');
const { readdirSync, existsSync } = require('fs');

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

	const pendingExists = pending[contractId];
	if (pendingExists) {
		return reply.send({ status: 'pending' });
	}

	let count = Object.keys(pending).length;

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

	const status = pending[contractId];
	const error = errors[contractId];

	if (error) {
		return reply.send({ error, status: 'errored' });
	}
    
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

fastify.get('/diff/:id', async (request, reply) => {

	const { id } = request.params;

	const codeDiff = await getCodeDiff(id);

	if (!codeDiff) {
		return reply.send({ status: 'unknown' });
	}
    
	reply.send({
		status: 'success',
		diff: JSON.parse(codeDiff.code_diff)
	});
});

fastify.post('/audit/:contractId/reset/:key', async (request, reply) => {

	const { contractId, key } = request.params;

	if (key !== process.env.RESET_KEY) {
		return reply.send({ status: 'invalid password key' });
	}

	if (contractId === 'all') {
		rmAsync(process.env.REPORTS_ROOT_DIR, { recursive: true });
		pending = {};
		startsAt = {};
	} else {
		delete pending[contractId];
		delete startsAt[contractId];
		if (await existsAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`))) {
			rmAsync(join(process.env.REPORTS_ROOT_DIR, `${contractId}.pdf`));
		} else {
			return reply.send({ status: 'unknown' });
		}
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

if (existsSync(join(process.env.REPORTS_ROOT_DIR))) {
	const reportCount = readdirSync(join(process.env.REPORTS_ROOT_DIR)).length;
	console.log(`Found ${reportCount} reports`);
} else {
	console.log('No reports found');
}
