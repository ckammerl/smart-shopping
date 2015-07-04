var Q = require('q');
var request = require('request');
var config = require('./config.js');
var mongoose = require('mongoose');
var models = require('../../db/database.js');
var Item = mongoose.model('Item', models.item);
var cheerio = require('cheerio');


var mode = function(array) {
  var count = {};
  var maxCount = 0;
  var max;
  for (var i = 0; i < array.length; i++) {
    count[array[i]] = (count[array[i]] || 0) + 1;
    if (count[array[i]] > maxCount) {
      maxCount = count[array[i]];
      max = array[i];
    }
  }
  return max;
};

module.exports = {

  createNewItem: function(req, res, next) {
    var name = req.body.name.toLowerCase();
    var newItem = new Item({
      name: name,
      data: {
        frequency: req.body.frequency,
        coupons: ['none'],
        expiration: new Date(2015,8,16)
      }
    });
    var location = req.body.loc.toLowerCase();
    location = location.slice(-2) + location.slice(0, location.length - 4);
    var salesObject = {};

    var findItem = Q.nbind(Item.findOne, Item);
    var createItem = Q.nbind(Item.create, Item);

    findItem({name: name})
    .then(function(match) {
      if (match) { // if there's a match for finding the item, go to the next
        req.smartShoppingData = match;
        next();
      } else { // if there's no match create the item
        var uri = 'http://api.nal.usda.gov/usda/ndb/search/'
        var api_key = config.usdaKey;
        var query = '?format=json&q=' + newItem.name + '&sort=r&max=10&offset=0&api_key=' + api_key;

        request.get(uri + query, function(err, res, body) {
          if (err) {
            console.error(err);
          }
          var categories = [];
          if (JSON.parse(body).list) {
            var data = JSON.parse(body).list.item;
            for (var i = 0; i < data.length; i++) {
              categories.push(data[i].group);
            }
            newItem.data.food_category = mode(categories);
          } else {
            newItem.data.food_category = 'unknown';
          }

          var url = 'http://www.wholefoodsmarket.com/sales-flyer';
          var results = [];
          request(url, function(error, response, html) {
            if (!error) {
              var $ = cheerio.load(html);
              $('optgroup').each(function(index, opt){
                if (opt.attribs.label.toLowerCase() === location) {
                  var matchedLocations = $(this).find('option');
                  for (var i = 0; i < matchedLocations.length; i++) {
                    results.push(matchedLocations[i].attribs.value);
                  }
                  var url = 'http://www.wholefoodsmarket.com/sales-flyer?store=' + results[0];
                  request(url, function(error, response, html) {
                    if (!error) {
                      var $ = cheerio.load(html);
                      $('.view-content .views-row').each(function(index, content) {
                        var productName = $(this).find('.views-field-field-flyer-product-name div').text();
                        productName = productName.toLowerCase();
                        if (productName.indexOf(name) !== -1) {
                          var $priceData = $(this).find('.prices')
                          var salePrice = "Sale " + $priceData.find('.my_price').text() + $priceData.find('.sub_price').text();
                          if (salePrice.length === 5) {
                            salePrice = $priceData.find('.sale_line').text();
                          }
                          var regPrice = $priceData.find('.reg_line').text();
                          var $dates = $(this).find('.views-field-field-flyer-end-date');
                          var startDate = $dates.children()[1].children[0].data;
                          var endDate = $dates.children()[2].children[0].data;
                          var saleDates = startDate + ' - ' + endDate;

                          salesObject.item = name;
                          salesObject.market = 'Whole Foods';
                          salesObject.salePrice = salePrice;
                          salesObject.regPrice = regPrice;
                          salesObject.saleDates = saleDates;
                          newItem.data.sales = salesObject;

                          createItem(newItem)
                          .then(function(createdItem) {
                            req.smartShoppingData = createdItem;
                            next();
                          })
                          .catch(function(err) {
                            console.error(err);
                            res.status(500).send({error: 'Server Error'});
                          });
                        } else {
                          newItem.data.sales = salesObject;

                          createItem(newItem)
                          .then(function(createdItem) {
                            req.smartShoppingData = createdItem;
                            next();
                          })
                          .catch(function(err) {
                            console.error(err);
                            res.status(500).send({error: 'Server Error'});
                          });
                        }
                      });
                    } else {
                      console.log(error);
                    }
                  })
                }
              });
            } else {
              console.log(error);
            }
          })

        });
      }
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).send({error: 'Server Error'});
    });
  }
}
