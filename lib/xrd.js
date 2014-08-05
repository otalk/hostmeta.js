'use strict';

var jxt = require('jxt');
var NS = 'http://docs.oasis-open.org/ns/xri/xrd-1.0';


module.exports = function (registry) {
    var Properties = {
        get: function () {
            var results = {};
            var props = jxt.find(this.xml, NS, 'Property');
    
            for (var i = 0, len = props.length; i < len; i++) {
                var property = props[i];
                var type = jxt.getAttribute(property, 'type');
                results[type] = property.textContent;
            }
    
            return results;
        }
    };
    
    var XRD = registry.define({
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
    
    
    var Link = registry.define({
        name: '_xrdlink',
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
    
    registry.extend(XRD, Link, 'links');

    return XRD;
};
