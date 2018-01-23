/*

  BB strategy - okibcn 2018-01-03

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var BB = require('./indicators/BB.js');
var RSI = require('./indicators/RSI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.name = 'BB';
  this.nsamples = 0;
  this.trend = {
    zone: 'none',  // none, top, high, low, bottom
    duration: 0,
    persisted: false,
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('bb', 'BB', this.settings.bbands);
  this.addIndicator('rsi', 'RSI', this.settings)
}


// for debugging purposes log the last
// calculated parameters.
method.log = function (candle) {
  var digits = 8;
  var BB = this.indicators.bb;
  var rsi = this.indicators.rsi;
  //BB.lower; BB.upper; BB.middle are your line values 

  console.log('______________________________________');
  console.log('calculated BB properties for candle ', this.nsamples);

  if (BB.upper > candle.close) console.log('\t', 'Upper BB:', BB.upper.toFixed(digits));
  if (BB.middle > candle.close) console.log('\t', 'Mid   BB:', BB.middle.toFixed(digits));
  if (BB.lower >= candle.close) console.log('\t', 'Lower BB:', BB.lower.toFixed(digits));
  console.log('\t', 'price:', candle.close.toFixed(digits));
  if (BB.upper <= candle.close) console.log('\t', 'Upper BB:', BB.upper.toFixed(digits));
  if (BB.middle <= candle.close) console.log('\t', 'Mid   BB:', BB.middle.toFixed(digits));
  if (BB.lower < candle.close) console.log('\t', 'Lower BB:', BB.lower.toFixed(digits));
  console.log('\t', 'Band gap: ', BB.upper.toFixed(digits) - BB.lower.toFixed(digits));

  console.log('calculated RSI properties for candle:');
  console.log('\t', 'rsi:', rsi.result.toFixed(digits));
  console.log('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function (candle) {
  var BB = this.indicators.bb;
  var price = candle.close;
  var rsi = this.indicators.rsi;

  this.nsamples++;

  // price Zone detection
  var zone = 'none';
  if (price >= BB.upper) zone = 'top';
  if ((price < BB.upper) && (price >= BB.middle)) zone = 'high';
  if ((price > BB.lower) && (price < BB.middle)) zone = 'low';
  if (price <= BB.lower) zone = 'bottom';

  this.trend.duration++;

  console.log('current zone:  ', zone, ' for ', this.trend.duration, ' candle(s)');

  //try to buy under the lower bollinger band, then sell if rsi changes direction
  if (this.trend.zone == 'bottom' && rsi.result <= this.settings.thresholds.low) {
    console.log("advising long on rsi", rsi.result)
    this.advice('long')
    this.trend = {
      zone: zone,  // none, top, high, low, bottom
      duration: 0,
      persisted: false,
      adviced: true
    }
  }
  else if (this.trend.adviced && this.trend.zone != 'bottom' && rsi.result >= this.settings.thresholds.high) {
    console.log("advising short on rsi", rsi.result)
    this.advice('short')
    this.trend = {
      zone: zone,  // none, top, high, low, bottom
      duration: 0,
      persisted: false,      
    }
  }  

  this.advice();
}

module.exports = method;