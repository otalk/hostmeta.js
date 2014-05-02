'use strict';

var _ = require('underscore');
var jxt = require('jxt');


var NS = 'http://docs.oasis-open.org/ns/xri/xrd-1.0';

var Properties = {
    get: function () {
        var results = {};
        var props = jxt.find(this.xml, NS, 'Property');
        _.each(props, function (property) {
            var type = jxt.getAttribute(property, 'type');
            results[type] = property.textContent;
        });
        return results;
    }
};

var XRD = module.exports = jxt.define({
    name: 'xrd',
    namespace: NS,
    element: 'XRD',
    fields: {
        subject: jxt.subText(NS, 'Subject'),
        expires: jxt.dateSub(NS, 'Expires'),
        aliases: jxt.multiSubText(NS, 'Alias'),
        properties: Properties
    }
});


var Link = jxt.define({
    name: 'xrdlink',
    namespace: NS,
    element: 'Link',
    fields: {
        rel: jxt.attribute('rel'),
        href: jxt.attribute('href'),
        type: jxt.attribute('type'),
        template: jxt.attribute('template'),
        titles: jxt.subLangText(NS, 'Title', 'default'),
        properties: Properties
    }
});


jxt.extend(XRD, Link, 'links');
