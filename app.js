const express = require('express');
const path = require('path');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');

var app = express();
app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

require('./bot');
const google = require('./google');

app.get('/setup', (req, res) => {
  let url = google.generateAuthUrl();
  res.redirect(url)
})

app.get('/google/callback', (req, res) => {
  google.getToken(req.query.code)
  .then(tokens => google.createCalendarEvent(tokens, 'Test Event', '2017-10-25'))
  .then(response => {
    res.send('createCalendarEvent')
  })
  .catch(err => {
    console.log('error retrieving token: ', err)
    res.status(500).json(err)
  })
})

let port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('listening on', port);
})
