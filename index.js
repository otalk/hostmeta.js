'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

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

    var getJSON = new Promise(function (resolve, reject) {
        request(scheme + config.host + '/.well-known/host-meta.json').spread(function (req, body) {
            resolve(JSON.parse(body));
        }).catch(reject);
    });

    var getXRD = new Promise(function (resolve, reject) {
        request(scheme + config.host + '/.well-known/host-meta').spread(function (req, body) {
            var xrd = JXT.parse(body);
            resolve(xrd.toJSON());
        }).catch(reject);
    });


    return new Promise(function (resolve, reject) {
        Promise.some([getJSON, getXRD], 1).spread(resolve).catch(function () {
            reject('no-host-meta');
        });
    }).nodeify(cb);
};
