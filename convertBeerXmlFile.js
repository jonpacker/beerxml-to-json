var fs = require('fs');
var parseXml = require('xml2js').parseString;
var jsonPath = require('JSONPath').eval;
var async = require('async');
var moment = require('moment');
var tinseth = require('tinseth');

var fmtWeight = require('format-measurement').metric.weight;
var fmtVolume = require('format-measurement').metric.volume;

var stripEmpties = function(obj) {
  Object.keys(obj).forEach(function(key) {
    if (obj[key] === '') delete obj[key];
  });
};

console.err = function(str) { process.stderr.write(str + '\n') }

fs.readFile(process.argv[2], 'utf8', function(err, inputXml) {
  if (err) throw err;
  parseXml(inputXml, function(err, result) {
    if (err) throw err;
    createBeerJson(result);
  });
});

var floatify = function(resolver, modifier) {
  return function(callback) {
    resolver(function(err, val) {
      if (err) return callback(err);
      val = parseFloat(val);
      if (isNaN(val)) val = undefined;
      else if (typeof modifier == 'function') val = modifier(val);
      callback(null, val);
    })
  };
};

function createBeerJson(beerxml, cb) {
  if (!beerxml.RECIPES) {
    console.err("Couldn't find any recipes in " + process.argv[2]);
    return process.exit();
  }

  if (beerxml.RECIPES.RECIPE.length > 1) {
    console.err("WARNING: There is more than one recipe in " + process.argv[2]);
    console.err("The following recipes will be discarded:");
    beerxml.RECIPES.RECIPE.forEach(function(recipe, i) {
      if (i == 0) return;
      console.err(recipe.NAME[0]);
    });
  }

  var recipe = beerxml.RECIPES.RECIPE[0];

  var valAt = function(path) {
    return function(callback) { callback(null, jsonPath(recipe, path)[0]) };
  };
  var floatAt = function(path, mod) { return floatify(valAt(path), mod) }
  var percent = function(n) { return n / 100 };

  var boilTime = parseFloat(jsonPath(recipe, '$.BOIL_TIME[0]')[0]);
  var formatTime = function(time, dontHumanize) {
    time = parseFloat(time);
    if (time <= boilTime || dontHumanize) return time;
    return moment.duration(time, "minutes").humanize();
  };

  var formatSubstanceAmount = function(substance) {
    var amount = parseFloat(substance.AMOUNT[0]) * 1000;
    var isWeight = false;
    if (substance.AMOUNT_IS_WEIGHT) {
      var isWeightString = String(substance.AMOUNT_IS_WEIGHT[0]);
      isWeight = isWeightString.toLowerCase() == 'true';
    }
    return isWeight ? fmtWeight(amount) : fmtVolume(amount);
  };

  var prototype = {
    name: valAt('$.NAME[0]'),
    style: valAt('$.STYLE[0].NAME[0]'),
    brewer: valAt('$.BREWER[0]'),
    batchSize: floatAt('$.BATCH_SIZE[0]'),
    boilSize: floatAt('$.BOIL_SIZE[0]'),
    boilTime: floatAt('$.BOIL_TIME[0]'),
    efficiency: floatAt('$.EFFICIENCY[0]', percent),
    og: floatAt('$.OG[0]'),
    fg: floatAt('$.FG[0]'),
    hops: function(cb) {
      var hops = jsonPath(recipe, '$.HOPS[0].HOP.*').map(function(hopData) {
        var hop = {};
        if (hopData.NAME) hop.name = hopData.NAME[0];
        if (hopData.ALPHA) hop.aa = parseFloat(hopData.ALPHA[0]) / 100;
        if (hopData.AMOUNT) hop.amount = parseFloat(hopData.AMOUNT[0]);
        if (hopData.USE) hop.use = hopData.USE[0];
        if (hopData.TIME) { 
          var isBoil = String(hop.use).toLowerCase() == 'boil';
          hop.time = formatTime(hopData.TIME[0], isBoil);
        }
        if (hopData.FORM) hop.form = hopData.FORM[0];

        stripEmpties(hop);
        return hop;
      });
      cb(null, hops);
    },
    fermentables: function(cb) {
      var fermentables = jsonPath(recipe, '$.FERMENTABLES[0].FERMENTABLE.*');
      fermentables = fermentables.map(function(fmtblData) {
        var fmtbl = {}
        if (fmtblData.NAME) fmtbl.name = fmtblData.NAME[0];
        if (fmtblData.AMOUNT) fmtbl.amount = parseFloat(fmtblData.AMOUNT[0]);
        if (fmtblData.COLOR) fmtbl.color = parseFloat(fmtblData.COLOR[0]);
        if (fmtblData.YIELD) fmtbl.yield = parseFloat(fmtblData.YIELD[0]) / 100;
        if (fmtblData.IS_MASHED) {
          var mashed = String(fmtblData.IS_MASHED[0]).toLowerCase();
          fmtbl.mashed = mashed == 'true';
        } else {
          fmtbl.mashed = true;
        }

        stripEmpties(fmtbl);
        return fmtbl;
      });
      cb(null, fermentables);
    },
    additions: function(cb) {
      var additions = jsonPath(recipe, '$.MISCS[0].MISC.*');
      additions = additions.map(function(additionData) {
        var addition = {};
        if (additionData.NAME) addition.name = additionData.NAME[0];
        if (additionData.TIME) addition.time = formatTime(additionData.TIME[0]);
        if (additionData.USE) addition.use = additionData.USE[0];
        if (additionData.AMOUNT) 
          addition.amount = formatSubstanceAmount(additionData);
        
        stripEmpties(addition);
        return addition;
      });
      cb(null, additions);
    },
    yeast: function(cb) {
      var yeastData = jsonPath(recipe, '$.YEASTS[0].YEAST[0]')[0];
      var yeast = {};
      if (yeastData.NAME) yeast.name = yeastData.NAME[0];
      if (yeastData.TYPE) yeast.type = yeastData.TYPE[0];
      if (yeastData.LABORATORY) yeast.lab = yeastData.LABORATORY[0];
      if (yeastData.PRODUCT_ID) yeast.code = yeastData.PRODUCT_ID[0];
      if (yeastData.ATTENUATION) 
        yeast.attenuation = parseFloat(yeastData.ATTENUATION[0]) / 100;
      if (yeastData.AMOUNT) yeast.amount = formatSubstanceAmount(yeastData);
      stripEmpties(yeast);
      cb(null, yeast);
    },
    mash: function(cb) {
      var mashSteps = jsonPath(recipe, '$.MASH[0].MASH_STEPS[0].MASH_STEP.*');
      if (!mashSteps.length) return cb();
      mashSteps = mashSteps.map(function(mashStepData) {
        var mashStep = {};
        if (mashStepData.NAME) mashStep.name = mashStepData.NAME[0];
        if (mashStepData.TYPE) mashStep.type = mashStepData.TYPE[0];
        if (mashStepData.RAMP_TIME) {  
          mashStep.rampTime = parseFloat(mashStepData.RAMP_TIME[0]);
          if (mashStep.rampTime == 0) delete mashStep.rampTime;
        }
        if (mashStepData.STEP_TIME)
          mashStep.duration = parseFloat(mashStepData.STEP_TIME[0]);
        if (mashStepData.INFUSE_TEMP)
          mashStep.infusionTemp = parseFloat(mashStepData.INFUSE_TEMP[0]);
        if (mashStepData.STEP_TEMP)
          mashStep.targetTemp = parseFloat(mashStepData.STEP_TEMP[0]);
        if (mashStepData.END_TEMP) {
          mashStep.endTemp = parseFloat(mashStepData.END_TEMP[0]);
          if (mashStep.endTemp == mashStep.targetTemp) delete mashStep.endTemp;
        }

        // Only need one amount.
        if (mashStepData.INFUSE_AMOUNT ||
            mashStepData.DECOCTION_AMT ||
            mashStepData.DECOCTION_AMOUNT) {
          var infuseAmount = mashStepData.INFUSE_AMOUNT && 
                              parseFloat(mashStepData.INFUSE_AMOUNT[0]);
          var decoctionAmount = mashStepData.DECOCTION_AMOUNT &&
                                 parseFloat(mashStepData.DECOCTION_AMOUNT[0]);
          var decoctionAmt = mashStepData.DECOCTION_AMT && 
                              parseFloat(mashStepData.DECOCTION_AMT[0]);
          var amount = infuseAmount || decoctionAmount || decoctionAmt;
          if (amount > 0) mashStep.amount = amount;
        }
        stripEmpties(mashStep);
        return mashStep;
      });
      cb(null, mashSteps);
    },
    ibu: ["hops", "og", "boilSize", "batchSize", function(cb, beer) {
      if (recipe.IBU) {
        var ibu = parseFloat(recipe.IBU[0]);
        if (ibu > 0) return cb(null, ibu);
      }
    
      var ibu = beer.hops.reduce(function(ibu, hop) {
        if (String(hop.use).toLowerCase() != "boil") return ibu;
        return ibu + tinseth(beer.og, beer.boilSize, beer.batchSize, 
          hop.aa, hop.amount * 1000, hop.time);
      }, 0);

      cb(null, Math.round(ibu));
    }],
    color: ["fermentables", "batchSize", function(cb, beer) {
      if (recipe.EST_COLOR) {
        var color = parseFloat(recipe.EST_COLOR[0]);
        if (color > 0) return cb(null, color);
      }

      var batchSizeGals = beer.batchSize * 0.264172;
      var color = beer.fermentables.reduce(function(color, malt) {
        return color + (malt.color * malt.amount * 2.20462 / batchSizeGals);
      }, 0);
      color = 1.4922 * Math.pow(color, 0.6859); 

      cb(null, parseFloat(color.toFixed(1)));
    }],
    abv: ["og", "fg", function(cb, beer) {
      var abv = ((76.08*(beer.og-beer.fg)/(1.775-beer.og))*(beer.fg/0.794));
      cb(null, parseFloat(abv.toFixed(1)) / 100);
    }]
  };

  async.auto(prototype, function(err, result) {
    if (err) {
      console.log("Oh no! Something exploded :(. Here's the error I got:");
      console.log(err);
      return process.exit();
    }

    process.stdout.write(JSON.stringify(result, true, "  "));
  });
}
