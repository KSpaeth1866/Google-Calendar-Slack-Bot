"use strict";

const axios = require('axios');

async function interpretUserMessage(message, sessionId) {
  const data = await axios.get('https://api.dialogflow.com/v1/query', {
    params: {
      v: '20170712',
      query: message,
      sessionId,
      timezone: 'America/Los_Angeles',
      lang: 'en'
    },
    headers: {
      Authorization: `Bearer ${process.env.API_AI_TOKEN}`
    }
  });
  return data;
}

module.exports = {
  interpretUserMessage,
};
