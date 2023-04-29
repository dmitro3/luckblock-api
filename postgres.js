const { Client } = require('pg');
const client = new Client({
	host: process.env.PG_HOST,
	port: process.env.PG_PORT,
	user: process.env.PG_USER,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
});
 
client.connect();
 
module.exports.postgresClient = client;

module.exports.addCodeDiff = async function (contractId, codeDiff, id) {

	const res = await client.query('INSERT INTO code_diffs (contract_id, code_diff, code_diff_id) VALUES ($1, $2)', [
		contractId, codeDiff, id
	]);
	return res;

};

module.exports.getCodeDiff = async function (contractId, codeDiffId) {
    
	const res = await client.query('SELECT * FROM code_diffs WHERE id = $1 and contract_id = $2', [
		codeDiffId,
		contractId
	]);
	return res.rows[0];
    
};
