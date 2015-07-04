var React = require('react');
var Eventful = require('eventful-react');
var CalendarComponent = require('react-widgets').Calendar
var Calendar = require('./Calendar.jsx');
var Day = require('./Day.jsx');

var Tracker = Eventful.createClass({
  mixins: [ReactFireMixin],

  getInitialState: function() {
    var todaysDateInstance = new Date();
    var todaysDate = (todaysDateInstance.getMonth() + 1).toString() + '/' + todaysDateInstance.getDate().toString() + '/' + todaysDateInstance.getFullYear().toString();

    // firebase/groupme
    var groupMeGroupId = window.GROUP_ME_GROUP_ID;
    var firebaseUrl = window.FIREBASE_DB_ROOT + '/groupme-id-' + groupMeGroupId;
    var groupMeApiUrl = 'https://api.groupme.com/v3/groups/' + groupMeGroupId;
    var groupMeMessagesApiUrl = groupMeApiUrl + '/messages';
    var firebaseRef = new Firebase(firebaseUrl);
    return {
      dateClicked: todaysDate,
      groupMeToken: window.GROUP_ME_TOKEN,
      firebaseRef: firebaseRef,
      groupMeGroupId: groupMeGroupId,
      groupMeEventHashtags: window.EVENT_HASHTAGS,
      groupMeApiUrl: groupMeApiUrl,
      groupMeMessagesApiUrl: groupMeMessagesApiUrl,
      firebaseUrl: firebaseUrl,
      events: {},
      dateClicked: todaysDate,
      eventsForDayClicked: {}
    };
  },
  componentDidMount: function() {

    var ref = new Firebase(this.state.firebaseUrl + '/events');
    this.bindAsObject(ref, "events");

    this.on('dateClicked', function(data) {
      var dateInstance = data.dateInstance;
      var dateClicked = (dateInstance.getMonth() + 1).toString() + '/' + dateInstance.getDate().toString() + '/' + dateInstance.getFullYear().toString();
      var formattedDate = moment(dateInstance).format('L').split('/').join('-');
      var eventsForDayClicked = this.state.events[formattedDate];
      
      this.setState({
        dateClicked: dateClicked,
        eventsForDayClicked: eventsForDayClicked
      });
    });



    var addNewestMessagesFromGroupMeToFirebase = this.addNewestMessagesFromGroupMeToFirebase;
    var setFirstMessageIdAsFirstGroupMeMessageId = this.setFirstMessageIdAsFirstGroupMeMessageId;
    var isNewestMessageIdInFirebase = this.isNewestMessageIdInFirebase;
    var messageAdder = function() {
      isNewestMessageIdInFirebase(function(isNewestMessageIdInFirebase) {
        if (isNewestMessageIdInFirebase) {
          addNewestMessagesFromGroupMeToFirebase();
        } else {
          setFirstMessageIdAsFirstGroupMeMessageId();
        };
      });
    };
    setInterval(messageAdder, 2000);

  },

  addWorkout: function(message) {
    var firebaseRef = this.state.firebaseRef
    var timeStamp = parseInt(message.created_at);
    var day = moment.unix(timeStamp).utc().format('L').split('/').join('-');
    console.log('date: ', day);
    console.log('workout to be added, ', message.text);
    var firebaseWorkoutDay = firebaseRef.child("events").child(day);
    firebaseWorkoutDay.push(message);
  },

  isWorkout: function(messageText) {
    var loggingTypes = this.state.groupMeEventHashtags;
    var hasLogger = false;
    if (messageText) {
      for (var i = 0; i < loggingTypes.length; i++) {
        var logType = loggingTypes[i];
        if (messageText.indexOf(logType) > -1) {
          hasLogger = true;
          break;
        };
      };
    };
    return hasLogger;
  },

  isNewestMessageIdInFirebase: function(callback) {
    console.log('calling isNewestMessageIdInFirebase');
    var addNewestMessagesFromGroupMeToFirebase = this.addNewestMessagesFromGroupMeToFirebase;
    var setFirstMessageIdAsFirstGroupMeMessageId = this.setFirstMessageIdAsFirstGroupMeMessageId;

    this.state.firebaseRef.child('newest_message_id').once("value", 
      function(snapshot) {
        var newest_message_id = snapshot.val();
        if (newest_message_id) {
          callback(true);
        } else {
          callback(false);
        };
      }, 
      function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      }
    );
  },

  addNewestMessagesFromGroupMeToFirebase: function() {
    var groupMeToken = this.state.groupMeToken;
    var firebaseRef = this.state.firebaseRef;
    var groupMeMessagesApiUrl = this.state.groupMeMessagesApiUrl;
    var isWorkout = this.isWorkout;
    var addWorkout = this.addWorkout;
    var addNewestMessagesFromGroupMeToFirebase = this.addNewestMessagesFromGroupMeToFirebase;

    getNewestMessageIdFromFirebase = function(callback, callback2) { // 3

      firebaseRef.child('newest_message_id').once("value", 
        function(snapshot) {
          var newest_message_id = snapshot.val();
          callback(newest_message_id, callback2);
        }, 
        function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        }
      );
    };

    getNewestMessagesFromGroupMe = function(afterId, callback) { // 1

      $.ajax({
          url: groupMeMessagesApiUrl,
          type:'get',
          data: {
            after_id: afterId,
            limit: 100,
            token: groupMeToken
          },
          success: function(response) {
            var messages = response.response.messages;
            callback(messages);
          },
          error: function(xhr) {
            console.log('Error in initial call for messages in setFirstMessageIdAsFirstGroupMeMessageId: ', xhr);
          }
      });
    };

    addMessagesGrabbedToFirebase = function(messages) {

      if (messages.length > 0) {
        var firebaseMessages = firebaseRef.child("messages");
        var messagesLength = messages.length;
        for (var i = 0; i < messagesLength; i++) {
          var message = messages[i];
          firebaseMessages.push(message);
          if (message.text && isWorkout(message.text)) {
            addWorkout(message);
          };
          if (i === (messagesLength - 1)) {
            var firebaseNewestMessageId = firebaseRef.child("newest_message_id");
            firebaseNewestMessageId.set(messages[messages.length - 1].id, function() { // set latest message id
              addNewestMessagesFromGroupMeToFirebase();
            });
          };
        };
      } 
    };

    getNewestMessageIdFromFirebase(function(afterId) {
      getNewestMessagesFromGroupMe(afterId, addMessagesGrabbedToFirebase);
    });

  },

  setFirstMessageIdAsFirstGroupMeMessageId: function() {

    var firebaseRefNewestMessageId = this.state.firebaseRef.child('newest_message_id');
    var firstMessageId = '';
    var groupMeMessagesApiUrl = this.state.groupMeMessagesApiUrl;
    var groupMeToken = this.state.groupMeToken;

    var recursiveGetMessagesBeforeId = function(lastMessageId) {
      console.log('in setFirstMessageIdAsFirstGroupMeMessageId groupMeMessagesApiUrl: ', groupMeMessagesApiUrl);
      console.log('ajax call: ' + groupMeMessagesApiUrl + '?' + 'limit=100' + '&before_id=' + lastMessageId + '&token=' + groupMeToken);
      $.ajax({
          url: groupMeMessagesApiUrl,
          type:'get',
          data: {
            limit: 100,
            before_id: lastMessageId,
            token: groupMeToken
          },
          success: function(response) {
            console.log('in setFirstMessageIdAsFirstGroupMeMessageId the response: ', response);
            console.log('last message id in recursive: ', lastMessageId);
            var messages = [];
            if (response) {
              messages = response.response.messages;
              lastMessageId = messages[messages.length - 1].id;
            };
            if (messages.length === 100) {
              recursiveGetMessagesBeforeId(lastMessageId)
            } else {
              var firstMessageId = lastMessageId;
              firebaseRefNewestMessageId.set(firstMessageId);
              console.log('First GroupMe message id was set to: ', firstMessageId);
              console.log('The first message in this GroupMe: ', messages[messages.length - 1]);
            } 
          },
          error: function(xhr) {
            console.log('Error in recursiveGetMessagesBeforeId call to GroupMe Messages: ', xhr);
          }
      });
    };

    $.ajax({
        url: groupMeMessagesApiUrl,
        type:'get',
        data: {
          limit: 100,
          token: this.state.groupMeToken
        },
        success: function(response) {
          var messages = response.response.messages;
          var lastMessageId = messages[messages.length - 1].id;
          recursiveGetMessagesBeforeId(lastMessageId);
        },
        error: function(xhr) {
          console.log('Error in initial call for messages in setFirstMessageIdAsFirstGroupMeMessageId: ', xhr);
        }
    });

  },

  render: function() {
    window.dateClicked = this.state.dateClicked;
    window.events = this.state.events;

    return (
      <div className="row" id="tracker">
        <h1>Shopping Tracker</h1>
        <h4>{this.state.groupMeEventHashtags}</h4>
        <div className="col-md-6">
          <Calendar dateClicked={this.state.dateClicked} />
        </div>
        <div className="col-md-6 single-day">
          <Day dateClicked={this.state.dateClicked} eventsForDayClicked={this.state.eventsForDayClicked} events={this.state.events} />
        </div>
      </div>
    );
  }
});

module.exports = Tracker;


