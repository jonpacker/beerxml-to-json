var fs = require('fs'),
    xml = require('xmldoc');

fs.readFile(process.argv[2], 'utf8', function(err, beerxml) {
  var xbeer = new xml.XmlDocument(beerxml);
  console.log(JSON.stringify(xbeer, true, "  "));
});
