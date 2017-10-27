"use strict";
var google = require('googleapis');
var calendar = google.calendar('v3');
var OAuth2 = google.auth.OAuth2;
var scope = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

const getAuthClient = () => {
  return new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/google/callback'
  );
}

module.exports = {
  generateAuthUrl(slackId) {
    return getAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope,
      state: slackId,
    });
  },

  getToken(code) {
    var client = getAuthClient();
    return new Promise(function(resolve, reject) {
      client.getToken(code, function (err, tokens) {
        if (err)  {
          reject(err);
        } else {
          resolve(tokens);
        }
      });
    });
  },

  createCalendarEvent(tokens, description, date) {
    let client = getAuthClient();
    client.setCredentials(tokens);

    return new Promise(function(resolve, reject) {
      calendar.events.insert({
        auth: client,
        calendarId: 'primary',
        resource: {
          summary: description,
          start: {
            date,
            'timeZone': 'America/Los_Angeles',
          },
          end: {
            date,
            'timeZone': 'America/Los_Angeles'
          }
        }
      }, function(err, res) {
        if (err)  {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },

  createCalendarMeeting(tokens, description, date, time, invitees) {
    let client = getAuthClient();
    client.setCredentials(tokens);

    let start = new Date(date + ' ' + time)
    let end = new Date(date + ' ' + time)
    end.setTime(start.getTime() + 1800000)
    start = start.toISOString();
    end = end.toISOString();

    let attendees = invitees
    .map(invitee => ({email: invitee.email,}))
    .filter(attendee => attendee.email ? attendee : null)

    return new Promise(function(resolve, reject) {
      calendar.events.insert({
        auth: client,
        calendarId: 'primary',
        resource: {
          summary: description,
          start: {
            dateTime: start,
            'timeZone': 'America/Los_Angeles',
          },
          end: {
            dateTime: end,
            'timeZone': 'America/Los_Angeles'
          },
          attendees: attendees,
          'reminders': {
            'useDefault': false,
            'overrides': [
              {'method': 'email', 'minutes': 24 * 60},
              {'method': 'popup', 'minutes': 10},
            ],
          },
        }
      }, function(err, res) {
        if (err)  {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },

  checkCalendarAvailability(tokens, date, time) {
    let client = getAuthClient();
    client.setCredentials(tokens);

    let start = new Date(date + ' ' + time)
    let end = new Date(date + ' ' + time)
    end.setTime(start.getTime() + 1800000)
    start = start.toISOString();
    end = end.toISOString();

    return new Promise((resolve, reject) => {
      calendar.freebusy.query({
        auth: client,
        resource: {
          timeMin: start,
          timeMax: end,
          timeZone: 'America/Los_Angeles',
          items: [
            {id: 'spaet062@umn.edu',},
            {id: 'kspaeth123@gmail.com',},
          ],
        }
      }, function(err, res) {
        if (err)  {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },
};
