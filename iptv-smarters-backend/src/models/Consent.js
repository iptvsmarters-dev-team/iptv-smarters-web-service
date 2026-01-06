const { DataTypes } = require('sequelize');

/**
 * CONSENT MODEL - Keep Forever (Mandatory for compliance)
 * Rules:
 * - Tie all aggregation jobs to consent = true
 * - Allow retroactive exclusion if user opts out
 * - Version consent text (important for audits)
 */
module.exports = (sequelize) => {
    const Consent = sequelize.define('Consent', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        anonUserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        // Version of consent text user agreed to
        consentVersion: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '1.0'
        },
        consentTimestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        // Region for GDPR/CCPA compliance
        region: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            allowNull: false
        },
        // Granular consent options
        dataSharingOptIn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        analyticsOptIn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        personalizedAdsOptIn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Withdrawal tracking
        withdrawnAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'consents',
        timestamps: true,
        indexes: [
            { fields: ['anonUserId'] },
            { fields: ['consentVersion'] },
            { fields: ['dataSharingOptIn'] }
        ]
    });

    return Consent;
};
