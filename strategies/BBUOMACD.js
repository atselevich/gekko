/*

  BB strategy - okibcn 2018-01-03

 */
// helpers
var _ = require("lodash");
var log = require("../core/log.js");

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.name = "BBUOMACD";
  this.nsamples = 0;
  this.longprice = 0;
  this.longtrades = 0;

  this.trend = {
    zone: "none",  // none, top, high, low, bottom
    duration: 0,
    persisted: false,
    position: "none"
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addTalibIndicator("bb", "bbands", this.settings.bbands);
  this.addTalibIndicator("uo", "ultosc", this.settings.ultosc);
  this.addTalibIndicator("macd", "macd", this.settings.macd);
};


// for debugging purposes log the last
// calculated parameters.
method.log = function (candle) {
};

method.check = function (candle) {

  //Bolliger Bands
  var bbresult = this.talibIndicators.bb.result;
  var bblower = bbresult["outRealLowerBand"];
  var bbmiddle = bbresult["outRealMiddleBand"];
  var bbupper = bbresult["outRealUpperBand"];

  var price = candle.close;
  this.nsamples++;

  var uo = this.talibIndicators.uo;
  var uoVal = uo.result["outReal"];

  var macd = this.talibIndicators.macd;
  var diff = macd.result['outMACD'] - macd.result['outMACDSignal'];
  
  // price Zone detection
  var zone = "none";
  if (price >= bbupper) zone = "top";
  if ((price < bbupper) && (price >= bbmiddle)) zone = "high";
  if ((price > bblower) && (price < bbmiddle)) zone = "low";
  if (price <= bblower) zone = "bottom";

  if (this.trend.zone === "bottom" || this.trend.zone === "low") {
    this.trend.zone = zone;  // none, top, high, low, bottom
    this.trend.duration++;
    this.trend.persisted = true;

  }
  else {
    this.trend.zone = zone;  // none, top, high, low, bottom
    this.trend.duration = 0;
    this.trend.persisted = false;
  }
  
  log.debug("LONGPRICE: ", this.longprice);  

  if (zone === "bottom" && uoVal <= this.settings.thresholds.low && diff < 0 && this.trend.duration >= this.settings.thresholds.persistence) {
    log.debug("ADVISING LONG");    
    this.advice("long");
    this.trend.position = "long";
    this.longprice += price;
    this.longtrades++;    
  }
  if ((price > (this.longprice / this.longtrades) && uoVal >= this.settings.thresholds.high && this.trend.position === "long")) {       
    this.longtrades = 0;
    this.longprice = 0;
    log.debug("ADVISING SHORT");
    this.advice("short");
    this.trend.position = "none";
  }
};

module.exports = method;
