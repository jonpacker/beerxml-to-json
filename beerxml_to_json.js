var fs = require('fs'),
    xml = require('xmldoc'),
    _ = require('underscore');

fs.readFile(process.argv[2], 'utf8', function(err, beerxml) {
  var xbeer = new xml.XmlDocument(beerxml);

  function processRecipe(xmlrecipe) {
    var recipe = {};

    recipe.name = xmlrecipe.valueWithPath("NAME");
    recipe.brewer = xmlrecipe.valueWithPath("BREWER"); 
    recipe.style = xmlrecipe.valueWithPath("STYLE.NAME");
    recipe.batchSize = parseFloat(xmlrecipe.valueWithPath("BATCH_SIZE"));
    recipe.boilSize = parseFloat(xmlrecipe.valueWithPath("BOIL_SIZE"));
    recipe.boilTime = parseInt(xmlrecipe.valueWithPath("BOIL_TIME"));
    recipe.efficiency = parseFloat(xmlrecipe.valueWithPath("EFFICIENCY"));
    recipe.og = parseFloat(xmlrecipe.valueWithPath("OG"));
    recipe.fg = parseFloat(xmlrecipe.valueWithPath("FG"));
    recipe.ibu = parseFloat(xmlrecipe.valueWithPath("IBU"));
    recipe.abv = parseFloat(xmlrecipe.valueWithPath("EST_ABV"));

    return JSON.stringify(recipe, true, "  ");
  }

  console.log(processRecipe(xbeer.children[0]))
});
