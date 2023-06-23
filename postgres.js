const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
	host: process.env.PG_HOST,
	dialect: 'postgres'
});

const CodeDiff = sequelize.define('CodeDiff', {
	codeDiffId: {
		type: Sequelize.STRING,
		allowNull: false,
		primaryKey: true
	},
	contractId: {
		type: Sequelize.STRING,
		allowNull: false,
		primaryKey: true
	},
	codeDiff: {
		type: Sequelize.TEXT,
		allowNull: false
	}
});

module.exports = {
	CodeDiff
};
