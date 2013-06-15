var fs = require('fs');
var parseXml = require('xml2js').parseString;
var createBeerJson = require('./convertBeerXml');
var colors = require('colors');
var events = new (require('events').EventEmitter);

fs.readFile(process.argv[2], 'utf8', function(err, inputXml) {
  if (err) return events.emit('error', err.message);
  parseXml(inputXml, function(err, result) {
    if (err) return events.emit('error', err.message);
    var converter = createBeerJson(result, function(err, beerjson) {
      if (!err) process.stdout.write(JSON.stringify(beerjson, true, "  "));
    });
    converter.on('error', events.emit.bind(events, 'error'));
    converter.on('warning', events.emit.bind(events, 'warning'));
  });
});

events.on('error', function(err) {
  process.stderr.write('ERROR: '.red + err + '\n');
});
events.on('warning', function(warning) {
  process.stderr.write('WARNING: '.yellow + warning + '\n');
});
