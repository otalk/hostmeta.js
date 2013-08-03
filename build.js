var bundle = require('browserify')();
var fs = require('fs');


bundle.add('./hostmeta');
bundle.bundle({standalone: 'getHostMeta'}).pipe(fs.createWriteStream('hostmeta.bundle.js'));
