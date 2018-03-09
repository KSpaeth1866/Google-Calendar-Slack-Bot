"use strict";

const express = require('express');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const {
  User
} = require('./models');

mongoose.connect(process.env.MONGODB_URI);

const app = express();
app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

require('./bot');
const google = require('./google');

app.get('/setup', (req, res) => {
  const url = google.generateAuthUrl(req.query.slackId);
  res.redirect(url);
});

app.get('/google/callback', async (req, res) => {
  try {
    const user = await User.findOne({slackId: req.query.state});
    const tokens = await google.getToken(req.query.code);
    user.google.tokens = tokens;
    user.google.isSetupComplete = true;
    await user.save();
    res.status(200).send('You are now authenticated with Google! Thanks.');
  }
  catch (err) {
    console.log('error retrieving token', err);
    res.status(500).send("Error, please wait and try again");
  }
});

app.post('/slack/interactive', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const user = await User.findOne({slackId: payload.user.id});
    if (payload.actions[0].value === 'true') {
      if (user.pending.time) {
        await google.createCalendarMeeting(
          user.google.tokens,
          user.pending.description,
          user.pending.date,
          user.pending.time,
          user.pending.invitees
        );
      }
      else await google.createCalendarEvent(user.google.tokens, user.pending.description, user.pending.date);
      user.pending = {invitees: []};
      await user.save();
      res.send('Created Reminder :white_check_mark:');
    }
    else {
      user.pending = {invitees: []};
      await user.save();
      res.send('Cancelled :x:');
    }
  }
  catch (err) {
    console.log('error in slack interactive token', err);
    res.status(500).send("Error, please wait and try again");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n
    \t********************************
    \t* Express started on port ${port} *
    \t********************************
  `);
});
