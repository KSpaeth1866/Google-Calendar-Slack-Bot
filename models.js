"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const UserSchema = new Schema({
  slackId: {
    type: String,
    required: true,
  },
  google: {
    tokens: Object,
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
  },
  pending: {
    date: String,
    description: String,
    invitees: Array,
    time: String,
  },
});

UserSchema.statics.findOrCreate = async (slackId) => {
  const user = await User.findOne({slackId});
  return user ? user : new User({slackId}).save();
};

const User = mongoose.model('User', UserSchema);

module.exports = {
  User,
};
