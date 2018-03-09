"use strict";

const {
  WebClient,
  RtmClient,
  MemoryDataStore,
  RTM_EVENTS
} = require('@slack/client');
const dialogflow = require('./dialogflow');
const {
  User
} = require('./models');
const _ = require('underscore');

// eslint-disable-next-line
const slack_token = process.env.SLACK_BOT_TOKEN || '';

const rtm = new RtmClient(
  slack_token,
  {
    dataStore: new MemoryDataStore(),
  }
);
const web = new WebClient(slack_token);
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, async (message) => {
  if (! message.user) return;
  const user = await User.findOrCreate(message.user);
  try {
    if (user.pending.date) web.chat.postMessage(message.channel, 'Please resolve the previous request first');
    else if (user.google.isSetupComplete) handleConversation(message, user);
    else web.chat.postMessage(message.channel, `I need access to your Google Calendar\n http://localhost:3000/setup?slackId=${message.user}`);
  }
  catch(err) {
    console.log(`error in handling bot message: ${err}`);
  }
});

async function handleConversation(message, user) {
  // parses and manages the conversation w/ the user
  const msg = parseUsersInMessage(message);
  const req = await dialogflow.interpretUserMessage(msg, message.user);
  try {
    if (req.data.result.actionIncomplete) {
      web.chat.postMessage(message.channel, req.data.result.fulfillment.speech);
      return;
    }
    await setPending(user, req.data);
    const interactiveMessage = createJSInteractiveMessage(req.data);
    web.chat.postMessage(message.channel, null, createSlackInteractiveMessage(interactiveMessage));
  }
  catch(err) {
    console.log('Error in handling to Dialogflow', err);
  }
}

function parseUsersInMessage(message) {
  // deals with <@xxx> format of slack ids
  let msg = message.text.split(' ');
  msg = msg.map(word => {
    if (word[0] === '<' && word[word.length - 1] === '>') {
      const person = rtm.dataStore.getUserById(word.slice(2, word.length - 1));
      return person.name;
    }
    return word;
  });
  msg = msg.join(' ');
  return msg;
}

function createJSInteractiveMessage(data) {
  // creates user-friendly template for event/meeting creation
  let interactiveMessage = "Calendar Event:\n";
  interactiveMessage += data.result.parameters.description ? `Description: ${data.result.parameters.description}\n` : '';
  interactiveMessage += data.result.parameters.date ? `On: ${data.result.parameters.date}\n` : '';
  interactiveMessage += data.result.parameters.time ? `At: ${data.result.parameters.time}\n` : '';
  interactiveMessage += data.result.parameters.invitees ? `With: ${data.result.parameters.invitees.join(', ')}\n` : '';
  return interactiveMessage;
}

function createSlackInteractiveMessage(message) {
  // creates slack interface for confirmation once event details are decided
  return {
    "text": message,
    "attachments": [
      {
        "text": "Proceed?",
        "fallback": "You are unable to create a reminder",
        "callback_id": "reminder",
        "attachment_type": "default",
        "actions": [
          {
            "name": "confirm",
            "text": "Confirm",
            "type": "button",
            "style": "primary",
            "value": "true"
          },
          {
            "name": "cancel",
            "text": "Cancel",
            "type": "button",
            "style": "danger",
            "value": "false"
          }
        ]
      }
    ]
  };
}

async function setPending(user, data) {
  // parses data and updates pending event info in user model
  Object.assign(user.pending, _.pick(data.result.parameters, 'description', 'date', 'time'));
  if (data.result.parameters.invitees) {
    user.pending.invitees = data.result.parameters.invitees.map(invitee => {
      try {
        const person = rtm.dataStore.getUserByName(invitee);
        return {
          slackId: person.id,
          email: person.profile.email,
          name: person.name,
        };
      }
      catch (e) {
        return {
          slackId: null,
          email: null,
          name: invitee,
        };
      }
    });
  }
  user.save();
}
