'use strict';

var async = require('async');
var request = require('request');

var JXT = require('jxt').createRegistry();

JXT.use(require('./lib/xrd'));


module.exports = function (opts, cb) {
    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    var config = {
        ssl: true,
        json: true,
        xrd: true
    };

    for (var prop in opts) {
        config[prop] = opts[prop];
    }

    var scheme = config.ssl ? 'https://' : 'http://';

    async.parallel([
        function (done) {
            request(scheme + config.host + '/.well-known/host-meta.json', function (err, req, body) {
                if (err) {
                    return done(null);
                }

                var data;
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    data = null;
                }
                return done(data);
            });
        },
        function (done) {
            request(scheme + config.host + '/.well-known/host-meta', function (err, req, body) {
                if (err) {
                    return done(null);
                }

                var xrd = JXT.parse(body);
                return done(xrd.toJSON());
            });
        }
    ], function (result) {
        if (result) {
            cb(null, result);
        } else {
            cb('no-host-meta');
        }
    });
};
