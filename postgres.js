const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
	host: process.env.PG_HOST,
	dialect: 'postgres'
});

const ContractAudit = sequelize.define('ContractAudit', {
	contractId: {
		type: DataTypes.STRING,
		allowNull: false,
		primaryKey: true
	},
	contractName: {
		type: DataTypes.STRING,
		allowNull: false
	}
});

const ContractAuditIssue = sequelize.define('ContractAuditIssue', {
	id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		primaryKey: true,
		autoIncrement: true
	},
	issueContractId: {
		type: DataTypes.INTEGER,
		allowNull: false
	},
	issueExplanation: {
		type: DataTypes.TEXT,
		allowNull: false
	},
	issueCodeDiff: {
		type: DataTypes.TEXT,
		allowNull: false
	}
});

module.exports = {
	ContractAudit,
	ContractAuditIssue
};
