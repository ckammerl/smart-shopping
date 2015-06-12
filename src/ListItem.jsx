var React = require('react');
var Eventful = require('eventful-react');
var ModeToggle = require('./ModeToggle');

var ListItem = Eventful.createClass({
  getInitialState: function() {
    return {
      value: this.props.name,
      editable: false
    };
  },
  componentWillReceiveProps: function(newProps) {
    this.setState({ value: newProps.name });
  },
  switchToEditable: function() {
    this.setState({editable: true}, function() {
      React.findDOMNode(this.refs.editInput).focus();
    });
  },
  updateValue: function(e) {
    this.setState({ value: e.target.value });
  },
  updateItem: function(e) {
    e.preventDefault();
    var name = e.target.itemName.value;
    this.emit('update-item',{
      index: this.props.index,
      name: name
    });
    this.setState({editable: false});
  },
  removeItem: function() {
    this.emit('remove-item', { index: this.props.index, name: this.props.name });
  },
  render: function() {
    var cssClasses = {
      staticItem: 'static-item ',
      editableItem: 'editable-item ',
      editingIcon: 'fa fa-trash fa-lg remove-button editing-icon ',
      shoppingIcon: 'fa fa-check fa-lg remove-button shopping-icon '
    };

    if (this.state.editable) {
      cssClasses.staticItem += 'hide';
      cssClasses.editableItem += 'show';
    } else {
      cssClasses.staticItem += 'show';
      cssClasses.editableItem += 'hide';
    }

    if (this.props.mode === ModeToggle.SHOPPING) {
      cssClasses.editingIcon += 'hide';
      cssClasses.shoppingIcon += 'show';
    } else {
      cssClasses.editingIcon += 'show';
      cssClasses.shoppingIcon += 'hide';
    }
    if (this.props.sales) {
      var salesDivs = [
        <div className="sales market-name">{this.props.sales.market}</div>,
        <div className="sales sale-price">{this.props.sales.salePrice}</div>,
        <div className="sales reg-price">{this.props.sales.regPrice}</div>,
        <div className="sales sale-dates">{this.props.sales.saleDates}</div>
      ]
    }

    return (
      <li className="list-item animated fadeInDown">
        <div className={cssClasses.staticItem}>
          <i className={cssClasses.shoppingIcon} onClick={this.removeItem}></i>
          <i className ={cssClasses.editingIcon} onClick={this.removeItem}></i>
          <div className="item-label" onClick={this.switchToEditable}>{this.props.name}</div>
          <div className="food-cat">{this.props.foodCategory}</div>
          {salesDivs}
        </div>
        <div className={cssClasses.editableItem}>
          <form name={"item-form-" + this.props.index} onSubmit={this.updateItem}>
            <input type="text" ref="editInput" name="itemName" value={this.state.value} onChange={this.updateValue} />
          </form>
        </div>
      </li>
    );
  }
});

module.exports = ListItem;
