var fs = require('fs');
var parseXml = require('xml2js').parseString;
var path = require('JSONPath').eval;
var async = require('async');

fs.readFile(process.argv[2], 'utf8', function(err, inputXml) {
  if (err) throw err;
  parseXml(inputXml, function(err, result) {
    if (err) throw err;
    createBeerJson(result);
  });
});



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

  var atPath = function(jsonPath) { return path(beerxml, jsonPath); }
  var asyncPath = function(path) {
    return function(callback) { callback(null, atPath(path)) };
  };

  var prototype = {
    name: asyncPath('$.NAME[0]')
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
