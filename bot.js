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

function createInteractiveMessage(data) {
  let interactiveMessage = "Calendar Event:\n";
  interactiveMessage += data.result.parameters.description ? `Description: ${data.result.parameters.description}\n` : '';
  interactiveMessage += data.result.parameters.date ? `On: ${data.result.parameters.date}\n` : '';
  interactiveMessage += data.result.parameters.time ? `At: ${data.result.parameters.time}\n` : '';
  interactiveMessage += data.result.parameters.invitees ? `With: ${data.result.parameters.invitees}\n` : '';
  return interactiveMessage;
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

async function handleConversation(message, user) {
  let msg = parseUsersInMessage(message)
  let req = await dialogflow.interpretUserMessage(msg, message.user)
  data = req.data;
  try {
    if (data.result.actionIncomplete) {
      web.chat.postMessage(message.channel, data.result.fulfillment.speech);
      return null;
    }
    else {
      user.pending.description = data.result.parameters.description;
      user.pending.date = data.result.parameters.date;
      user.pending.time = data.result.parameters.time;
      if (data.result.parameters.invitees) {
        user.pending.invitees = data.result.parameters.invitees.map(invitee => {
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
      }
      await user.save()
      let interactiveMessage = createInteractiveMessage(data)
      web.chat.postMessage(message.channel, null, getInteractiveMessage(interactiveMessage));
    }
  }
  catch(err) {
    console.log('Error in handling to Dialogflow', err);
  }
}

rtm.on(RTM_EVENTS.MESSAGE, async (message) => {
  if (! message.user) return
  let user = await User.findOrCreate(message.user)
  try {
    if (user.pending.date) {
      console.log(user.pending.date);
      web.chat.postMessage(message.channel, 'Please resolve the previous request first')
    }
    else if (user.google.isSetupComplete) {
      handleConversation(message, user)
    }
    else web.chat.postMessage(message.channel, `I need access to your Google Calendar\n http://localhost:3000/setup?slackId=${message.user}`);
  }
  catch(err) {
    console.log(`error in handling bot message: ${err}`);
  }
});
