const express = require('express');
const path = require('path');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const {
  User
} = require('./models');

mongoose.connect(process.env.MONGODB_URI)

var app = express();
app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

require('./bot');
const google = require('./google');

app.get('/setup', (req, res) => {
  let url = google.generateAuthUrl(req.query.slackId);
  res.redirect(url)
})

app.get('/google/callback', (req, res) => {
  let user;
  User.findOne({slackId: req.query.state})
  .then(u => {
    user = u;
    return google.getToken(req.query.code)
  })
  .then(tokens => {
    user.google.tokens = tokens;
    user.google.isSetupComplete = true;
    return user.save();
  })
  .then(saveResp => {
    console.log('successful save');
    res.status(200).json(saveResp)
  })
  .catch(err => {
    console.log('error retrieving token: ', err)
    res.status(500).json(err)
  })
})

app.post('/slack/interactive', (req, res) => {
  var payload = JSON.parse(req.body.payload);
  if (payload.actions[0].value === 'true') {
    User.findOne({slackId: payload.user.id})
    .then(user => {
      user.pending.time ?
      google.createCalendarMeeting(user.google.tokens, user.pending.description, user.pending.date, user.pending.time, user.pending.invitees) :
      google.createCalendarEvent(user.google.tokens, user.pending.description, user.pending.date)
    })
    .then(function() {
      res.send('Created Reminder :white_check_mark:')
    })
    .catch(function(err) {
      console.log('Error creating reminder', err);
    });
  }
  else res.send('Cancelled :x:')
})

let port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('listening on', port);
})
