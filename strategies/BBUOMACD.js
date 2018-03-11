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
  this.uoMod = 0;

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
  this.addTalibIndicator("uo2", "ultosc", this.settings.ultosc2);
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

  var uo2 = this.talibIndicators.uo2;
  var uoVal2 = uo.result["outReal"];

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

  var isLow = uoVal2 < this.settings.thresholdsSecondary.low;
  var thresholds = { low: 0, high: 0, persistence: 1000 }

    if (isLow) {
    thresholds.low = this.settings.thresholdsLow.low;
    thresholds.high = this.settings.thresholdsLow.high;
    thresholds.persistence = this.settings.thresholdsLow.persistence;
  }
  else {
    thresholds.low = this.settings.thresholdsHigh.low;
    thresholds.high = this.settings.thresholdsHigh.high;
    thresholds.persistence = this.settings.thresholdsHigh.persistence;
  }

  var persistence = (this.trend.position === "long" ? thresholds.persistence * this.settings.custom.persistenceMod : thresholds.persistence);  

  var canLong = ((zone === "bottom" && uoVal <= (thresholds.low + this.uoMod)) && this.trend.duration >= persistence) || (uoVal <= this.settings.thresholdsSecondary.absoluteLow)

  if (canLong) {

    log.debug("ADVISING LONG")
    log.debug(uoVal2)
    this.advice("long");
    this.trend.position = "long";
    this.longprice += price;
    this.uoMod += this.settings.custom.uoMod;
    this.longtrades++;
    this.trend.duration = 0;
    this.trend.persisted = false;
  }

  var canShort = false;
  var avePrice = this.longprice / this.longtrades;

  if (this.longtrades > this.settings.custom.maxLongs) {
    if (this.longtrades > this.settings.custom.maxLongs * this.settings.custom.maxLongsMod) {
      canShort = uoVal >= thresholds.high && this.trend.position === "long";
    }
    else {
      canShort = price > avePrice && uoVal >= thresholds.high && this.trend.position === "long";
    }
  }
  else {
    canShort = price > bblower && price > avePrice * (1 + this.settings.custom.priceMod) && uoVal >= thresholds.high && this.trend.position === "long";
  }

  if (canShort) {
    this.longtrades = 0;
    this.longprice = 0;
    this.uoMod = 0;
    //log.debug("ADVISING SHORT");
    this.advice("short");
    this.trend.position = "none";
  }
};

module.exports = method;