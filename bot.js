const {
  WebClient,
  RtmClient,
  MemoryDataStore,
  RTM_EVENTS
} = require('@slack/client');
const dialogflow = require('./dialogflow');
const google = require('./google');
const mongoose = require('mongoose');
const {
  User
} = require('./models');

var token = process.env.SLACK_BOT_TOKEN || '';

var rtm = new RtmClient(token, {
  dataStore: new MemoryDataStore(),
});
var web = new WebClient(token);
rtm.start();

function parseUsersInMessage(message) {
  let msg = message.text.split(' ');
  msg = msg.map(word => {
    if (word[0] === '<' && word[word.length - 1] === '>') {
      let person = rtm.dataStore.getUserById(word.slice(2, word.length - 1))
      return person.name
    }
    return word
  })
  msg = msg.join(' ')
  return msg
}

function handleDialogflowConvo(message, user) {
  let msg = parseUsersInMessage(message)
  dialogflow.interpretUserMessage(msg, message.user)
  .then(function(res) {
    if (res.data.result.actionIncomplete) {
      web.chat.postMessage(message.channel, res.data.result.fulfillment.speech);
      return null;
    }
    else {
      user.pending.description = res.data.result.parameters.description;
      user.pending.date = res.data.result.parameters.date;
      user.pending.time = res.data.result.parameters.time;
      user.pending.invitees = res.data.result.parameters.invitees.map(invitee => {
        try {
          let person = rtm.dataStore.getUserByName(invitee)
          return {
            slackId: person.id,
            email: person.profile.email,
            name: person.name,
          }
        }
        catch (e) {
          return {
            slackId: null,
            email: null,
            name: invitee,
          }
        }
      });
      return user.save()
      .then(function() {
        let interactiveMessage = "Calendar Event:\n";
        interactiveMessage += res.data.result.parameters.description ? `Description: ${res.data.result.parameters.description}\n` : ''
        interactiveMessage += res.data.result.parameters.date ? `On: ${res.data.result.parameters.date}\n` : ''
        interactiveMessage += res.data.result.parameters.time ? `At: ${res.data.result.parameters.time}\n` : ''
        interactiveMessage += res.data.result.parameters.invitees ? `With: ${res.data.result.parameters.invitees}\n` : ''
        web.chat.postMessage(message.channel, null, getInteractiveMessage(interactiveMessage));
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
