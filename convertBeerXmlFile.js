var fs = require('fs');
var createBeerJson = require('./convertBeerXml');
var colors = require('colors');

var events = new (require('events').EventEmitter);

fs.readFile(process.argv[2], 'utf8', function(err, inputXml) {
  if (err) return events.emit('err', err.message);
  var converter = createBeerJson(inputXml, function(err, beerjson) {
    if (!err) process.stdout.write(JSON.stringify(beerjson, true, "  "));
  });
  converter.on('err', events.emit.bind(events, 'err'));
  converter.on('warning', events.emit.bind(events, 'warning'));
});

events.on('err', function(err) {
  process.stderr.write('ERROR: '.red + err + '\n');
});
events.on('warning', function(warning) {
  process.stderr.write('WARNING: '.yellow + warning + '\n');
});
