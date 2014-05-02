'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var jxt = require('jxt');
var XRD = require('./lib/xrd');


module.exports = function (opts, cb) {
    if (typeof opts === 'string') {
        opts = {host: opts};
    }
    opts = _.extend({
        ssl: true,
        json: true,
        xrd: true
    }, opts);

    var scheme = opts.ssl ? 'https://' : 'http://';

    var getJSON = new Promise(function (resolve, reject) {
        request(scheme + opts.host + '/.well-known/host-meta.json').spread(function (req, body) {
            resolve(JSON.parse(body));
        }).catch(reject);
    });

    var getXRD = new Promise(function (resolve, reject) {
        request(scheme + opts.host + '/.well-known/host-meta').spread(function (req, body) {
            var xrd = jxt.parse(body, XRD);
            resolve(xrd.toJSON());
        }).catch(reject);
    });


    return new Promise(function (resolve, reject) {
        Promise.some([getJSON, getXRD], 1).spread(resolve).catch(function () {
            reject('no-host-meta');
        });
    }).nodeify(cb);
};
