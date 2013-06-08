var bh = require('brauhaus');
var fs = require('fs');

var xmlFile = process.argv[2];

fs.readFile(xmlFile, 'utf8', function(err, xml) {
  if (err) throw err;

  var recipe = bh.Recipe.fromBeerXml(xml);
  recipe = recipe[0];
  recipe.calculate();
  console.log(JSON.stringify(recipe, true, " "));

  var beer = {
    name: recipe.name,
    batchSize: recipe.batchSize,
    boilSize: recipe.boilSize,
    units: 'metric',
    brewer: recipe.author,
    og: recipe.og,
    fg: recipe.fg,
    color: recipe.color,
    abv: recipe.abv
  };

  if (Array.isArray(recipe.fermentables)) {
    beer.fermentables = {};
    recipe.fermentables.forEach(function(fermentable) {
      beer.fermentables[fermentable.name] = fermentable.weight;
    });
  }

  if (recipe.style && recipe.style.name) beer.style = recipe.style.name;

  console.log(JSON.stringify(beer, true, "  "))
  
});
