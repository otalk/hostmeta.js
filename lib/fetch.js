'use strict';

var http = require('http');

module.exports = function (uri, cb) {
    var buffer = '';
    var req = http.get(uri);

    req.on('data', function (data) {
        buffer += data;
    });

    req.on('error', function () {
        cb('error');
    });

    req.on('end', function () {
        cb(null, buffer);
    });
};
