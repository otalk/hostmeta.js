# getHostMeta

## What is this?

A browser module for looking up metadata about a host, using the `/.well-known/host-meta[.json]` files, which is useful for discovering associated services for a host, such as an OpenID endpoint or where to connect for an XMPP BOSH/WebSocket session.

Suitable for use with browserify/CommonJS on the client. 

If you're not using browserify or you want AMD support use `getusermedia.bundle.js`.


## Installing

```
npm install hostmeta
```


## How to use it

```
var getHostMeta = require('hostmeta');

getHostMeta('example.com', function (err, data) {
    if (err) {
        console.log("Couldn't retrieve host-meta data");
    }
    console.log(data);
    // Where data might look like:
    // {
    //   "links": [
    //     {
    //       "rel": "urn:xmpp:altconnect:websocket",
    //       "href': "wss://example.com:5281/xmpp-websocket"
    //     },
    //     {
    //       "rel": "author",
    //       "href': "http://example.com/joe"
    //     }
    //   ]
    // }
});
```

## License

MIT

## Created By

If you like this, follow: [@lancestout](http://twitter.com/lancestout) on twitter.
