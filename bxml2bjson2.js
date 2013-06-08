var fs = require('fs');
var parseXml = require('xml2js').parseString;
var jsonPath = require('JSONPath').eval;
var async = require('async');

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
    console.log("Couldn't find any recipes in " + process.argv[2]);
    return process.exit();
  }

  if (beerxml.RECIPES.RECIPE.length > 1) {
    console.log("WARNING: There is more than one recipe in " + process.argv[2]);
    console.log("The following recipes will be discarded:");
    beerxml.RECIPES.RECIPE.forEach(function(recipe, i) {
      if (i == 0) return;
      console.log(recipe.NAME[0]);
    });
  }

  var recipe = beerxml.RECIPES.RECIPE[0];

  var valAt = function(path) {
    return function(callback) { callback(null, jsonPath(recipe, path)[0]) };
  };
  var floatAt = function(path, mod) { return floatify(valAt(path), mod) }

  var percent = function(n) { return n / 100 };

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
        if (hopData.ALPHA) hop.aa = parseFloat(hopData.ALPHA[0]);
        if (hopData.AMOUNT) hop.amount = parseFloat(hopData.AMOUNT[0]);
        if (hopData.USE) hop.use = hopData.USE[0];
        if (hopData.TIME) hop.time = parseFloat(hopData.TIME);
        if (hopData.FORM) hop.form = hopData.FORM[0];
        return hop;
      });
      cb(null, hops);
    }
  };

  async.auto(prototype, function(err, result) {
    if (err) {
      console.log("Oh no! Something exploded :(. Here's the error I got:");
      console.log(err);
      return process.exit();
    }

    console.log(JSON.stringify(result, true, "  "));
  });
}
