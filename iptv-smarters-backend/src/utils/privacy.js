const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

/**
 * PRIVACY UTILITIES
 * Core principles:
 * - No raw personal data stored
 * - No IP addresses stored long-term
 * - No precise location
 * - No cross-app tracking
 * - Everything aggregated
 */

// Hash sensitive data (one-way, non-reversible)
const hashData = (data) => {
    if (!data) return null;
    return CryptoJS.SHA256(data + process.env.SECRET_KEY).toString();
};

// Generate anonymous user ID (random, non-reversible)
const generateAnonUserId = () => {
    return uuidv4();
};

// Get region bucket from country code (coarse location only)
const getRegionBucket = (countryCode) => {
    if (!countryCode) return 'other';

    const regionMap = {
        // US regions
        'US': 'us_east', // Default, can be refined by timezone
        // EU West
        'GB': 'eu_west', 'IE': 'eu_west', 'FR': 'eu_west', 'ES': 'eu_west',
        'PT': 'eu_west', 'NL': 'eu_west', 'BE': 'eu_west', 'DE': 'eu_west',
        // EU East
        'PL': 'eu_east', 'CZ': 'eu_east', 'HU': 'eu_east', 'RO': 'eu_east',
        'BG': 'eu_east', 'UA': 'eu_east', 'RU': 'eu_east',
        // APAC
        'CN': 'apac', 'JP': 'apac', 'KR': 'apac', 'IN': 'apac',
        'AU': 'apac', 'NZ': 'apac', 'SG': 'apac', 'TH': 'apac',
        // LATAM
        'MX': 'latam', 'BR': 'latam', 'AR': 'latam', 'CO': 'latam',
        'CL': 'latam', 'PE': 'latam',
        // MENA
        'SA': 'mena', 'AE': 'mena', 'EG': 'mena', 'TR': 'mena',
        'IL': 'mena', 'QA': 'mena'
    };

    return regionMap[countryCode.toUpperCase()] || 'other';
};

// Validate consent before data processing
const validateConsent = (consentData) => {
    return consentData &&
           consentData.dataSharingOptIn === true &&
           consentData.consentTimestamp;
};

// Sanitize data - remove any PII that might slip through
const sanitizeData = (data) => {
    const piiFields = ['email', 'phone', 'name', 'address', 'ip', 'ipAddress', 'gps', 'latitude', 'longitude'];
    const sanitized = { ...data };

    piiFields.forEach(field => {
        if (sanitized[field]) {
            delete sanitized[field];
            console.warn(`PII field "${field}" removed from data`);
        }
    });

    return sanitized;
};

module.exports = {
    hashData,
    generateAnonUserId,
    getRegionBucket,
    validateConsent,
    sanitizeData
};
