"use strict";

var { WebClient, RtmClient, RTM_EVENTS } = require('@slack/client');
var dialogflow = require('./dialogflow');

var token = process.env.SLACK_BOT_TOKEN || '';

var rtm = new RtmClient(token);
var web = new WebClient(token);
rtm.start();

function handleDialogflowConvo(message) {
  dialogflow.interpretUserMessage(message.text, message.user)
  .then(function(res) {
    if (res.data.result.actionIncomplete) {
      web.chat.postMessage(message.channel, res.data.result.fulfillment.speech);
    }
    else web.chat.postMessage(message.channel,
      `You asked me to remind you to ${res.data.result.parameters.description} on ${res.data.result.parameters.date}`);
  })
  .catch(function(err) {
    console.log('Error sending message to Dialogflow', err);
  });
}

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (! message.user) return
  web.chat.postMessage(message.channel, `Hello\nI'm Scheduler Bot. Before I do anything I need access to your Google Calendar\n http://localhost:3000/setup?slackId=${message.user}`);
});
