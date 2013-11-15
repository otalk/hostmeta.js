"use strict";

var _ = require('underscore');
var async = require('async');
var request = require('request');

var jxt = require('jxt');
var XRD = require('./lib/xrd');


module.exports = function (opts, cb) {
    if (!cb) return;

    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    opts = _.extend({
        ssl: true,
        json: true,
        xrd: true
    }, opts);

    var scheme = opts.ssl ? 'https://' : 'http://';

    async.parallel({
        json: function (jsonCb) {
            if (!opts.json) return jsonCb(null, {});
            request.get(scheme + opts.host + '/.well-known/host-meta.json', function (err, res) {
                if (err) return jsonCb(null, {});
                var completed, result;
                try {
                    result = JSON.parse(res.body);
                    completed = true;
                } catch (e) {
                    completed = false;
                    result = {};
                }
                jsonCb(completed, result);
            });
        },
        xrd: function (xrdCb) {
            if (!opts.xrd) return xrdCb(null, {});
            var completed, result;
            request.get(scheme + opts.host + '/.well-known/host-meta', function (err, res) {
                if (err) return xrdCb(null, {});
                try {
                    var xrd = jxt.parse(XRD, res.body, 'application/xml');
                    result = xrd.toJSON();
                    completed = true;
                } catch (e) {
                    completed = false;
                    result = {};
                }
                xrdCb(completed, result);
            });
        }
    }, function (completed, data) {
        if (completed) {
            if (data.json && Object.keys(data.json).length) {
                return cb(false, data.json);
            } else if (data.xrd && Object.keys(data.xrd).length) {
                return cb(false, data.xrd);
            }
        } else {
            cb('no-host-meta', {});
        }
    });
};
