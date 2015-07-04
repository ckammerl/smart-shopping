var React = require('react');
var Eventful = require('eventful-react');

var Day = Eventful.createClass({
  mixins: [ReactFireMixin],

  getInitialState: function() {

    return {

    };
  },
  componentDidMount: function() {

  },


  render: function() {

    var month = this.props.dateClicked.split('/')[0].toString();
    if (month.length === 1) {
      month = '0' + month;
    };
    var day = this.props.dateClicked.split('/')[1].toString();
    if (day.length === 1) {
      day = '0' + day;
    };
    var year = this.props.dateClicked.split('/')[2].toString();
    var formattedDate = month + '-' + day + '-' + year;

    var daysEvents = this.props.events[formattedDate];

    var eventsToDisplay = [];
    for (var key in daysEvents) {
      var loggedEvent = daysEvents[key]
      console.log('loggedEvent', loggedEvent);
      if (loggedEvent) {
        eventsToDisplay.push(
          <div className="logged-message">            
            <div className="logged-message-title">              
              {loggedEvent.name}
            </div>
            <div className="logged-message-text">
              {loggedEvent.text}
            </div>
          </div>
        );
      };
    };

    return (
      <div>
        <div><h2>{this.props.dateClicked}</h2></div>          
        <div>{eventsToDisplay}</div>
      </div>
    );
  }
});

module.exports = Day;


