const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function createService(friendlyName) {
    try {
        const service = await client.verify.v2.services.create({ friendlyName });
        console.log(`Twilio Service initialized with SID: ${service.sid}`);
        return service.sid;
    } catch (error) {
        console.error('Error creating service:', error);
        throw error;
    }
}

module.exports = { client, createService };
