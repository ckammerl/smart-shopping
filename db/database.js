var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var Item = new Schema({
    name: String,
    timestamp: { type: Date, default: Date.now },
    archived_timestamp: Date,
    data: {
      frequency: Number,
      coupons: [String],
      food_category: String,
      sales: {
        market: String,
        regPrice: String,
        salePrice: String,
        saleDates: String
      },
      expiration: Date
    }
  });

var User = new Schema({
  username: String,
  list: [{ type: Schema.Types.ObjectId, ref: 'Item'}],
  past_items: [{ item: { type: Schema.Types.ObjectId, ref: 'Item'}, name: String, archived: Date }]
});


module.exports = {
  Item: mongoose.model('Item', Item),
  User: mongoose.model('User', User)
};