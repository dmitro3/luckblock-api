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

const RegisteredAddresses = sequelize.define('registered_addresses', {
	id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		primaryKey: true,
		autoIncrement: true
	},
	address: {
		type: DataTypes.STRING,
		allowNull: false
	},
	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		defaultValue: DataTypes.NOW
	}
});

ContractAudit.sync();
ContractAuditIssue.sync();
RegisteredAddresses.sync();

ContractAudit.hasMany(ContractAuditIssue, {
	foreignKey: 'issueContractId'
});

ContractAuditIssue.belongsTo(ContractAudit, {
	foreignKey: 'issueContractId'
});

module.exports = {
	ContractAudit,
	ContractAuditIssue,
	RegisteredAddresses
};
