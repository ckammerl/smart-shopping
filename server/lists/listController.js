var Q = require('q');
var mongoose = require('mongoose');
var Item = require('../../db/database.js').Item;
var User = require('../../db/database.js').User;

var orderList = function(list) {
  list.sort(function(a, b) {
    if (a.data.food_category > b.data.food_category) {
      return 1;
    }
    if (a.data.food_category < b.data.food_category) {
      return -1;
    }

    return 0
  });

  return list;
};

var storeOrderedList = function(username, list, cb) {
  User.findOne({username: username})
      .populate('list')
      .exec(function(err, user) {
        if (err) console.error(err);
        var orderedList = orderList(user.list);
        User.update({username: username}, {'list': orderedList}, {upsert: true}, function(err) {
          if (err) {
            console.error(err);
            cb(false);
          }
          cb(true);
        });
      });
};

var getSuggestionDate = function(datesList) {
  var listElapsedDays = [];
  var suggestion = [];
  for (var i = 0; i < datesList.length-1; i++){
    var start = datesList[i];
    var stop = datesList[i+1];
    var elapsedTime = stop.getTime() - start.getTime();
    var elapsedDays = Math.round(elapsedTime / 86400000);
    listElapsedDays.push(elapsedDays);
  }

  if (listElapsedDays.length === 0) {
    return suggestion;
  }

  var sortedList = listElapsedDays.sort();
  console.log(sortedList);
  var median = sortedList[Math.floor(sortedList.length / 2)];

  if (median >= 0) {
    var lastArchiveDay = datesList[datesList.length-1];
    var tempDate = new Date();
    tempDate.setDate(lastArchiveDay.getDate() + median);
    var suggestionDate = tempDate.getMonth() + '-' + tempDate.getDate() + '-' + tempDate.getUTCFullYear();
    suggestion.push(suggestionDate, elapsedDays);
  }
  return suggestion;
};

module.exports = {
  createUser: function(uid) {
    var user = new User({username:uid, list:[], past_items:[]});
    var findUser = Q.nbind(User.find,User);
    var createUser = Q.nbind(User.create,User);

    return findUser({username: uid})
    .then(function(users) {
      if (users.length === 0) {
        return createUser(user);
      } else {
        throw new Error('Tried to create user which already exists');
      }
    })
    .then(function(newUser) {
      console.log('User created! Welcome: ', newUser.username);
    })
    .catch(function(err) {
      console.error('Error creating user:',err);
    });
  },

  getList: function(req, res) {
    var username = req.uid;
    User
    .findOne({username: username})
    .populate('list')
    .populate('past_items')
    // .populate({
    //   path: 'past_items',
    //   select: '_id archived_timestamp'
    // })
    .exec(function(err, user) {
      console.log(user);
      if (err) console.error(err);
      console.log('in get list, user:',user);

      res.send(user.list);
    });
  },

  addItemToList: function(req, res) {
    var username = req.uid;
    var name = req.smartShoppingData.name;

    User.findOneAndUpdate(
      {username: username},
      {$push: {'list': req.smartShoppingData._id}},
      {upsert: true},
      function(err, user) {
        if (err) {
          console.error(err);
          res.status(500).send({ error: 'Server Error'});
        }
        storeOrderedList(username, user.list, function(complete) {
          if (complete) {
            res.send(user.list);
          } else {
            res.status(500).send({error: 'Could not order list!'});
          }
        });
      });
  },

  addItemToArchive: function(req, res) {
    var username = req.uid;
    var index = Number(req.body.index);
    var itemName = req.body.name;

    User.findOne({username: username}, function(err, user) {
      var itemId = user.list[index];

      User.update(
        {username: username},
        {$push: {'past_items': {item: itemId, name: itemName, archived: new Date()}}},
        {safe: true, upsert: true},
        function(err, user) {
          if (err) console.error(err)
        });
    });

    var setModifier = { $set: {} };
    setModifier.$set['list.' + index] = null;
    User.update({username: username},
      setModifier,
      {upsert: true},
      function(err) {
      if (err) {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
      }
    });

    User.findOneAndUpdate({username: username}, {$pull: {'list': null}}, {upsert: true}, function(err, user) {
      if (err) {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
      }
      storeOrderedList(username, user.list, function(complete) {
        if (complete) {
          res.send(user.list);
        } else {
          res.status(500).send({error: 'Could not store list'});
        }
      });
    });
  },

  updateItem: function(req, res) {
    var username = req.uid;
    var newName = req.body.name.toLowerCase();
    var index = req.body.index;

    var setModifier = { $set: {} };
    setModifier.$set['list.' + index] = req.smartShoppingData._id;
    User.findOneAndUpdate({username: username}, setModifier, {upsert: true}, function(err, user) {
      if (err) {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
      }
      storeOrderedList(username, user.list, function(complete) {
        if (complete) {
          res.send(user.list);
        } else {
          res.status(500).send({error: 'Couldn\'t sort list!'});
        }
      });
    });
  },

  deleteItemFromList: function(req, res) {
    var username = req.uid;
    var index = req.body.index;

    var setModifier = {$set: {}};
    setModifier.$set['list.' + index] = null;
    User.update({username: username}, setModifier, {upsert: true}, function(err) {
      if (err) {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
      }
    });

    User.findOneAndUpdate({username: username}, {$pull: {'list': null}}, {upsert: true}, function(err, user) {
      if (err) {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
      }
      storeOrderedList(username, user.list, function(complete) {
        if (complete) {
          res.send(user.list);
        } else {
          res.status(500).send({error: 'Could not order list!'});
        }
      });
    });
  },

  getSuggestionList: function(req, res) {
    var username = req.uid;
    var archivedItemWithFrequency = {};
    var suggestionsList = {};

    User
      .findOne({username: username})
      .populate('past_items')
      .exec(function(err, user) {
        if (err) console.error(err);
        console.log('in getItemsToSuggest list, user:',user);

        var archivedItems = user.past_items;

        // only send suggestions when min 20 elems in archive
        if (archivedItems.length >= 20) {
          // iterate over archivedItems and
          // extract elems with same ObjectId ;
          for (var i = 0; i < archivedItems.length-1; i++) {
            for (var j = i+1; j <= archivedItems.length-1; j++) {
              var currentItemName = archivedItems[i].name;
              if (!currentItemName) {
                continue;
              } else {
                var currentItemId = archivedItems[i].item;
                var currentItemDate = archivedItems[i].archived;
                var nextItemName = archivedItems[j].name;
                // if item is listed more then once
                if ( currentItemName === nextItemName ) {
                  // if list hasn't item already as key
                  if ( !archivedItemWithFrequency.hasOwnProperty(currentItemName) ) {
                    archivedItemWithFrequency[currentItemName] = [currentItemDate];
                  } else {
                    archivedItemWithFrequency[currentItemName].push(currentItemDate);
                  }
                }
              }
            }
           }

           for (var key in archivedItemWithFrequency) {
            // [date, date, date]
            var archiveDates = archivedItemWithFrequency[key];
            var currentSuggestion = getSuggestionDate(archiveDates);

            if (!suggestionsList[currentSuggestion[0]]) { // [suggestionDate, elapsedDays]
              suggestionsList[currentSuggestion[0]] = [{item: {id: currentItemId, name: key, elapsedDays: currentSuggestion[1] }}];
            } else {
              // check if item already in list
              var currentList = suggestionsList[currentSuggestion[0]];
              for (var i = 0; i < currentList.length; i++) {
                for (var key in currentList[i]) {
                  if (currentList[i][key]['name']) {
                    continue;
                  } else {
                    suggestionsList[currentSuggestion[0]].push( {item: {id: currentItemId, name: currentItemName, elapsedDays: currentSuggestion[1]}} );
                  }
                }
              }
            }
           }
        }
        res.send(suggestionsList);
      });
  }
};

