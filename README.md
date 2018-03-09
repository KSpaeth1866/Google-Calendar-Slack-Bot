# Google-Calendar-Slack-Bot
Slack bot that interfaces with Google API to manage schedules

## Functionality

Ask the bot to schedule meeting with other people, either in the slack channel or not, and add them to your calendar.
![Meeting Creation](./assets/example_meeting.gif)

The bot will ask you to provide more details if you want to provide them or it can't understand your query.
![Conversation Fulfillment](./assets/example_fulfillment.gif)


## APIs/Technologies used

- Google's OAuth2 to authenticate users
- Google's Calendar API to create/modify calendar events
- Dialogflow to hold understand the intent of user queries and output a parameterized representation of a calendar meeting
- Slack’s Real-Time-Message and Web APIs for the actual bot
- MongoDB for user permissions persistence and pending meeting/schedule details
- Ngrok to expose an endpoint for Slack to accommodate interactive messages (Confirm/Cancel buttons)

## env.sh

The app needs an env.sh file (don't forget to `source env.sh` in the command line) with the following in fields:

- `PORT`, automatically set to 3000 unless specified
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SLACK_BOT_TOKEN`
- `API_AI_TOKEN`
- `MONDGODB_URI`
