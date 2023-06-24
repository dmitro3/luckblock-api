const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
	host: process.env.PG_HOST,
	dialect: 'postgres',
	sync: { alter: true }
});

const ContractAudit = sequelize.define('contract_audit', {
	contractId: {
		type: DataTypes.STRING,
		allowNull: false,
		primaryKey: true
	},
	contractName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	isProcessed: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	}
});

const ContractAuditIssue = sequelize.define('contract_audit_issue', {
	id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		primaryKey: true,
		autoIncrement: true
	},
	issueContractId: {
		type: DataTypes.STRING,
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

ContractAudit.sync();
ContractAuditIssue.sync();

ContractAudit.hasMany(ContractAuditIssue, {
	foreignKey: 'issueContractId'
});

ContractAuditIssue.belongsTo(ContractAudit, {
	foreignKey: 'issueContractId'
});

module.exports = {
	ContractAudit,
	ContractAuditIssue
};
