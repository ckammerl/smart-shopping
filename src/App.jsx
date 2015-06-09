var React = require('react');
var Eventful = require('eventful-react');

var Router = require('react-router');
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

var ModeToggle = require('./ModeToggle');
var auth = require('./auth');
var url = require('./url');

var App = Eventful.createClass({
  contextTypes: {
    router: React.PropTypes.func
  },

  getInitialState: function() {
    return {
      suggestions: [
        { name: 'milk' },
        { name: 'fish' }
      ],
      items: [],
      mode: ModeToggle.EDITING
    };
  },

  getList: function() {
    $.get(url.list)
    .done(function(data) {
      this.setState({ items: data });
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error getting item list:', status, err);
    });
  },

  addItem: function(item) {
    $.post(url.addItem, item)
    .done(function(data) {
      this.getList();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error adding new item to list:', status, err);
    });
  },

  updateItem: function(item) {
    $.post(url.updateItem, item)
    .done(function(data) {
      this.getList();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error updating item in list:', status, err);
    });
  },

  deleteItem: function(item) {
    $.ajax({
      url: url.deleteItem,
      type: 'DELETE',
      data: item
    })
    .done(function(data) {
      this.getList();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error deleting item from list:', status, err);
    });
  },

  archiveItem: function(item) {
    $.post(url.archiveItem, item)
    .done(function(data) {
      this.getList();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error archiving item in list:', status, err);
    });
  },

  registerUser: function(userData) {
    $.post(url.register, userData)
    .done(function(data) {
      console.log('registered:',data);
      this.context.router.transitionTo('/');
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error registering user:', status, err);
    });
  },

  loginUser: function(userData) {
    $.post(url.login, userData)
    .done(function(data) {
      this.context.router.transitionTo('/');
      this.getList();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error logging in user:', status, err);
    });
  },

  changeMode: function(data) {
    this.setState({ mode: data.mode });
  },

  getSuggestions: function() {
    $.get(url.getSuggestions)
    .done(function(data) {
      this.setState({ suggestions: data });
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error getting suggestions:', status, err);
    });
  },

removeSuggestion: function(data) {
    $.post(url.removeSuggestion, data)
    .done(function() {
      this.getSuggestions();
    }.bind(this))
    .fail(function(xhr, status, err) {
      console.error('Error removing suggestion:', status, err);
    });
  },

  componentDidMount: function() {
    // eventful event listeners
    this.on('register', function(data) {
      this.registerUser(data);
    }.bind(this));
    this.on('login', function(data) {
      this.loginUser(data);
    }.bind(this));

    this.on('update-item', function(data) {
      this.updateItem(data)
    }.bind(this));
    this.on('add-item', function(data) {
      this.addItem(data);
    }.bind(this));
    this.on('remove-item', function(data) {
      if (this.state.mode === ModeToggle.SHOPPING) {
        this.archiveItem(data);
      } else {
        this.deleteItem(data);
      }
    }.bind(this));

    this.on('change-mode', function(data) {
      this.changeMode(data);
    }.bind(this));

    this.on('remove-suggestion', function(data) {
      this.removeSuggestion(data);
    }.bind(this));

    this.getList();
    this.getSuggestions();
  },

  render: function() {
    //var loginOrOut = this.state.loggedIn ?
    //  <Link to="register"> Register Account</Link> :
    //  <Link to="login"> Sign In</Link>;
    return (
      <div id="app">
        <RouteHandler data={this.state} />
      </div>
    );
  }
});

module.exports = App;
