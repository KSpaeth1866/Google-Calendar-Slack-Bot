const {
  WebClient,
  RtmClient,
  RTM_EVENTS
} = require('@slack/client');
const dialogflow = require('./dialogflow');
const google = require('./google');
const mongoose = require('mongoose');
const {
  User
} = require('./models');

var token = process.env.SLACK_BOT_TOKEN || '';

var rtm = new RtmClient(token);
var web = new WebClient(token);
rtm.start();

function handleDialogflowConvo(message, user) {
  dialogflow.interpretUserMessage(message.text, message.user)
  .then(function(res) {
    if (res.data.result.actionIncomplete) {
      web.chat.postMessage(message.channel, res.data.result.fulfillment.speech);
      return null;
    }
    else {
      user.pending.description = res.data.result.parameters.description;
      user.pending.date = res.data.result.parameters.date;
      return user.save()
      .then(function() {
        web.chat.postMessage(message.channel, null,
          getInteractiveMessage(`Calendar event: \n${res.data.result.parameters.description} \non ${res.data.result.parameters.date}`));
      })
    }
  })
  .catch(function(err) {
    console.log('Error sending message to Dialogflow', err);
  })
}

  function getInteractiveMessage(message) {
    return {
      "text": message,
      "attachments": [
        {
          "text": "Confirm or cancel",
          "fallback": "You are unable to create a reminder",
          "callback_id": "reminder",
          "attachment_type": "default",
          "actions": [
            {
              "name": "confirm",
              "text": "confirm",
              "type": "button",
              "style": "primary",
              "value": "true"
            },
            {
              "name": "cancel",
              "text": "cancel",
              "type": "button",
              "style": "danger",
              "value": "false"
            }
          ]
        }
      ]
    }
  }

  rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
    if (! message.user) return
    User.findOrCreate(message.user)
    .then(user => {
      if (user.google.isSetupComplete) {
        handleDialogflowConvo(message, user)
      }
      else web.chat.postMessage(message.channel, `I need access to your Google Calendar\n http://localhost:3000/setup?slackId=${message.user}`);
    })
    .catch(err => {console.log(`error in finding Users: ${err}`);})
  });
