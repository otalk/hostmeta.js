var _ = require('./vendor/lodash');
var async = require('async');
var jxt = require('jxt');
var request = require('xhr');
var parser = new DOMParser();


function XRD(data, xml) {
    return jxt.init(this, xml, data);
}
XRD.prototype = {
    constructor: {
        value: XRD
    },
    NS: 'http://docs.oasis-open.org/ns/xri/xrd-1.0',
    EL: 'XRD',
    toString: jxt.toString,
    toJSON: jxt.toJSON,
    get subject() {
        return jxt.getSubText(this.xml, this.NS, 'Subject');
    },
    get expires() {
        return new Date(jxt.getSubText(this.xml, this.NS, 'Expires'));
    },
    get aliases() {
        return jxt.getMultiSubText(this.xml, this.NS, 'Alias');
    },
    get properties() {
        var results = {};
        var props = jxt.find(this.xml, this.NS, 'Property');
        _.each(props, function (property) {
            var type = jxt.getAttribute(property, 'type');
            results[type] = property.textContent;
        });
        return results;
    },
    get links() {
        var results = [];
        var links = jxt.find(this.xml, this.NS, 'Link');
        _.each(links, function (link) {
            var item = {
                rel: jxt.getAttribute(link, 'rel'),
                href: jxt.getAttribute(link, 'href'),
                type: jxt.getAttribute(link, 'type'),
                template: jxt.getAttribute(link, 'template'),
                titles: jxt.getSubLangText(link, this.NS, 'Title', 'default'),
                properties: {}
            };
            var props = jxt.find(link, this.NS, 'Property');
            _.each(props, function (property) {
                var type = jxt.getAttribute(property, 'type');
                item.properties[type] = property.textContent;
            });
            results.push(item);
        });
        return results;
    }
};


module.exports = function (opts, cb) {
    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    opts = _.extend({
        ssl: true,
        json: true
    }, opts);

    var scheme = opts.ssl ? 'https://' : 'http://';

    async.parallel({
        json: function (jsonCb) {
            if (!opts.json) return jsonCb(null, {});
            request({
                uri: scheme + opts.host + '/.well-known/host-meta.json'
            }, function (err, resp, body) {
                if (err) return jsonCb();
                try {
                    jsonCb('completed', JSON.parse(body));
                } catch (e) {
                    jsonCb(null, {});
                }
            });
        },
        xrd: function (xrdCb) {
            request({
                uri: scheme + opts.host + '/.well-known/host-meta'
            }, function (err, resp) {
                if (err) return xrdCb(null, {});
                try {
                    var body = parser.parseFromString(resp.body, 'application/xml').childNodes[0];
                    var xrd = new XRD({}, body);
                    xrdCb('completed', xrd.toJSON());
                } catch (e) {
                    xrdCb(null, {});
                }
            });
        }
    }, function (completed, data) {
        if (completed) {
            if (Object.keys(data.json).length) {
                return cb(false, data.json);
            } else if (Object.keys(data.xrd).length) {
                return cb(false, data.xrd);
            }
        }
        cb('no-host-meta', {});
    });
};
