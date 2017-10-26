var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var UserSchema = new Schema({
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

UserSchema.statics.findOrCreate = function(slackId) {
  return User.findOne({slackId})
    .then(function(user) {
      if (user) return user
      else return new User({slackId}).save()
    })
}

const User = mongoose.model('User', UserSchema)

module.exports = {
  User,
}
