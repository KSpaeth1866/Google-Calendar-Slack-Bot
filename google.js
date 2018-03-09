"use strict";
const google = require('googleapis');
const calendar = google.calendar('v3');
const OAuth2 = google.auth.OAuth2;
const scope = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

const getAuthClient = () => {
  return new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/google/callback'
  );
};

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
    const client = getAuthClient();
    return new Promise((resolve, reject) => {
      client.getToken(code, (err, tokens) => {
        err ? reject(err) : resolve(tokens);
      });
    });
  },

  createCalendarEvent(tokens, description, date) {
    // creates event- all day, single person
    // required: day, description
    const client = getAuthClient();
    client.setCredentials(tokens);

    return new Promise((resolve, reject) => {
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
      }, (err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  },

  createCalendarMeeting(tokens, description, date, time, invitees) {
    // creates meeting with people
    // required: invitees, day, time
    // optional: description
    const client = getAuthClient();
    client.setCredentials(tokens);

    let start = new Date(date + ' ' + time);
    let end = new Date(date + ' ' + time);
    end.setTime(start.getTime() + 1800000);
    start = start.toISOString();
    end = end.toISOString();

    const attendees = invitees
      .map(invitee => ({email: invitee.email}))
      .filter(attendee => attendee.email ? attendee : null);

    return new Promise((resolve, reject) => {
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
      }, (err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  },

  checkCalendarAvailability(tokens, date, time, invitees) {
    const client = getAuthClient();
    client.setCredentials(tokens);

    let start = new Date(date + ' ' + time);
    let end = new Date(date + ' ' + time);
    end.setTime(start.getTime() + 1800000);
    start = start.toISOString();
    end = end.toISOString();

    const items = invitees
      .map(invitee => ({id: invitee.email}))
      .filter(attendee => attendee.id ? attendee : null);
    items.push({id: 'primary'});

    return new Promise((resolve, reject) => {
      calendar.freebusy.query({
        auth: client,
        resource: {
          timeMin: start,
          timeMax: end,
          timeZone: 'America/Los_Angeles',
          items,
        }
      }, (err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  },
};
