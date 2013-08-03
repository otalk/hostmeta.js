(function(e){if("function"==typeof bootstrap)bootstrap("gethostmeta",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeGetHostMeta=e}else"undefined"!=typeof window?window.getHostMeta=e():global.getHostMeta=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
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

},{"./vendor/lodash":9,"async":2,"jxt":4,"xhr":6}],2:[function(require,module,exports){
(function(process){/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = setImmediate;
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

})(require("__browserify_process"))
},{"__browserify_process":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
var _ = require('./vendor/lodash');
var serializer = new XMLSerializer();
var XML_NS = 'http://www.w3.org/XML/1998/namespace';
var TOP_LEVEL_LOOKUP = {};
var LOOKUP = {};
var LOOKUP_EXT = {};


var find = exports.find = function (xml, NS, selector) {
    var children = xml.querySelectorAll(selector);
    return _.filter(children, function (child) {
        return child.namespaceURI === NS && child.parentNode == xml;
    });
};

exports.findOrCreate = function (xml, NS, selector) {
    var existing = find(xml, NS, selector);
    if (existing.length) {
        return existing[0];
    } else {
        var created = document.createElementNS(NS, selector);
        xml.appendChild(created);
        return created;
    }
};

exports.init = function (self, xml, data) {
    self.xml = xml || document.createElementNS(self.NS, self.EL);
    if (!self.xml.parentNode || self.xml.parentNode.namespaceURI !== self.NS) {
        self.xml.setAttribute('xmlns', self.NS);
    }

    self._extensions = {};
    _.each(self.xml.childNodes, function (child) {
        var childName = child.namespaceURI + '|' + child.localName;
        var ChildJXT = LOOKUP[childName];
        if (ChildJXT !== undefined) {
            var name = ChildJXT.prototype._name;
            self._extensions[name] = new ChildJXT(null, child);
            self._extensions[name].parent = self;
        }
    });

    _.extend(self, data);
    return self;
};

exports.getSubText = function (xml, NS, element) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].textContent || '';
        }
    }
    
    return '';
};

exports.getMultiSubText = function (xml, NS, element, extractor) {
    var subs = find(xml, NS, element);
    var results = [];
    extractor = extractor || function (sub) {
        return sub.textContent || '';
    };

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            results.push(extractor(subs[i]));
        }
    }
    
    return results;
};

exports.getSubLangText = function (xml, NS, element, defaultLang) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return {};
    }

    var lang, sub;
    var results = {};
    var langs = [];

    for (var i = 0; i < subs.length; i++) {
        sub = subs[i];
        if (sub.namespaceURI === NS) {
            lang = sub.getAttributeNS(XML_NS, 'lang') || defaultLang;
            langs.push(lang);
            results[lang] = sub.textContent || '';
        }
    }
    
    return results;
};


exports.setSubText = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = document.createElementNS(NS, element);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].textContent = value;
                    return;
                } else {
                    xml.removeChild(subs[i]);
                }
            }
        }
    }
};

exports.setMultiSubText = function (xml, NS, element, value, builder) {
    var subs = find(xml, NS, element);
    var values = [];
    builder = builder || function (value) {
        var sub = document.createElementNS(NS, element);
        sub.textContent = value;
        xml.appendChild(sub);
    };
    if (typeof value === 'string') {
        values = (value || '').split('\n');
    } else {
        values = value;
    }
    _.forEach(subs, function (sub) {
        xml.removeChild(sub);
    });
    _.forEach(values, function (val) {
        if (val) {
            builder(val);
        }
    });
};

exports.setSubLangText = function (xml, NS, element, value, defaultLang) {
    var sub, lang;
    var subs = find(xml, NS, element);
    if (subs.length) {
        for (var i = 0; i < subs.length; i++) {
            sub = subs[i];
            if (sub.namespaceURI === NS) {
                xml.removeChild(sub);
            }
        }
    }

    if (typeof value === 'string') {
        sub = document.createElementNS(NS, element);
        sub.textContent = value;
        xml.appendChild(sub);
    } else if (typeof value === 'object') {
        for (lang in value) {
            if (value.hasOwnProperty(lang)) {
                sub = document.createElementNS(NS, element);
                if (lang !== defaultLang) {
                    sub.setAttributeNS(XML_NS, 'lang', lang);
                }
                sub.textContent = value[lang];
                xml.appendChild(sub);
            }
        }
    }
};

exports.getAttribute = function (xml, attr, defaultVal) {
    return xml.getAttribute(attr) || defaultVal || '';
};

exports.setAttribute = function (xml, attr, value, force) {
    if (value || force) {
        xml.setAttribute(attr, value);
    } else {
        xml.removeAttribute(attr);
    }
};

exports.getBoolAttribute = function (xml, attr, defaultVal) {
    var val = xml.getAttribute(attr) || defaultVal || '';
    return val === 'true' || val === '1';
};

exports.setBoolAttribute = function (xml, attr, value) {
    if (value) {
        xml.setAttribute(attr, '1');
    } else {
        xml.removeAttribute(attr);
    }
};

exports.getSubAttribute = function (xml, NS, sub, attr, defaultVal) {
    var subs = find(xml, NS, sub);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].getAttribute(attr) || defaultVal || '';
        }
    }
    
    return '';
};

exports.setSubAttribute = function (xml, NS, sub, attr, value) {
    var subs = find(xml, NS, sub);
    if (!subs.length) {
        if (value) {
            sub = document.createElementNS(NS, sub);
            sub.setAttribute(attr, value);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].setAttribute(attr, value);
                    return;
                } else {
                    subs[i].removeAttribute(attr);
                }
            }
        }
    }
};

exports.toString = function () {
    return serializer.serializeToString(this.xml);
};

exports.toJSON = function () {
    var prop;
    var result = {};
    var exclude = {
        constructor: true,
        NS: true,
        EL: true,
        toString: true,
        toJSON: true,
        _extensions: true,
        prototype: true,
        xml: true,
        parent: true,
        _name: true
    };
    for (prop in this._extensions) {
        if (this._extensions[prop].toJSON) {
            result[prop] = this._extensions[prop].toJSON();
        }
    }
    for (prop in this) {
        if (!exclude[prop] && !((LOOKUP_EXT[this.NS + '|' + this.EL] || {})[prop]) && !this._extensions[prop] && prop[0] !== '_') {
            var val = this[prop];
            if (typeof val == 'function') continue;
            var type = Object.prototype.toString.call(val);
            if (type.indexOf('Object') >= 0) {
                if (Object.keys(val).length > 0) {
                    result[prop] = val;
                }
            } else if (type.indexOf('Array') >= 0) {
                if (val.length > 0) {
                    result[prop] = val;
                }
            } else if (!!val) {
                result[prop] = val;
            }
        }
    }
    return result;
};

exports.extend = function (ParentJXT, ChildJXT) {
    var parentName = ParentJXT.prototype.NS + '|' + ParentJXT.prototype.EL;
    var name = ChildJXT.prototype._name;
    var qName = ChildJXT.prototype.NS + '|' + ChildJXT.prototype.EL;

    LOOKUP[qName] = ChildJXT;
    if (!LOOKUP_EXT[qName]) {
        LOOKUP_EXT[qName] = {};
    }
    if (!LOOKUP_EXT[parentName]) {
        LOOKUP_EXT[parentName] = {};
    }
    LOOKUP_EXT[parentName][name] = ChildJXT;

    ParentJXT.prototype.__defineGetter__(name, function () {
        if (!this._extensions[name]) {
            var existing = exports.find(this.xml, ChildJXT.prototype.NS, ChildJXT.prototype.EL);
            if (!existing.length) {
                this._extensions[name] = new ChildJXT();
                this.xml.appendChild(this._extensions[name].xml);
            } else {
                this._extensions[name] = new ChildJXT(null, existing[0]);
            }
            this._extensions[name].parent = this;
        }
        return this._extensions[name];
    });
    ParentJXT.prototype.__defineSetter__(name, function (value) {
        var child = this[name];
        _.extend(child, value);
    });
};

exports.topLevel = function (JXT) {
    var name = JXT.prototype.NS + '|' + JXT.prototype.EL;
    LOOKUP[name] = JXT;
    TOP_LEVEL_LOOKUP[name] = JXT;
};

exports.build = function (xml) {
    var JXT = TOP_LEVEL_LOOKUP[xml.namespaceURI + '|' + xml.localName];
    if (JXT) {
        return new JXT(null, xml);
    }
};

exports.XML_NS = XML_NS;
exports.TOP_LEVEL_LOOKUP = TOP_LEVEL_LOOKUP;
exports.LOOKUP_EXT = LOOKUP_EXT;
exports.LOOKUP = LOOKUP;

},{"./vendor/lodash":5}],5:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) lodash.com/license
 * Build: `lodash include="each,extend,filter"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;!function(t){function r(t){return typeof t.toString!="function"&&typeof(t+"")=="string"}function e(t){t.length=0,g.length<y&&g.push(t)}function n(t){var r=t.k;r&&n(r),t.b=t.k=t.object=t.number=t.string=null,h.length<y&&h.push(t)}function o(){}function u(){var t=h.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1};t.g=v,t.b=t.c=t.f=t.h="",t.e="r",t.i=!0,t.j=!!X;for(var r,e=0;r=arguments[e];e++)for(var u in r)t[u]=r[u];
e=t.a,t.d=/^[^,]+/.exec(e)[0],r=Function,e="return function("+e+"){",u="var m,r="+t.d+",C="+t.e+";if(!r)return C;"+t.h+";",t.b?(u+="var s=r.length;m=-1;if("+t.b+"){",K.unindexedChars&&(u+="if(q(r)){r=r.split('')}"),u+="while(++m<s){"+t.f+";}}else{"):K.nonEnumArgs&&(u+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+t.f+";}}else{"),K.enumPrototypes&&(u+="var E=typeof r=='function';"),K.enumErrorProps&&(u+="var D=r===j||r instanceof Error;");var c=[];if(K.enumPrototypes&&c.push('!(E&&m=="prototype")'),K.enumErrorProps&&c.push('!(D&&(m=="message"||m=="name"))'),t.i&&t.j)u+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}";
else if(u+="for(m in r){",t.i&&c.push("l.call(r, m)"),c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}",K.nonEnumShadows){for(u+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];",k=0;7>k;k++)u+="m='"+t.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",t.i||(u+="||(!v[m]&&r[m]!==y[m])"),u+="){"+t.f+"}";u+="}"}return(t.b||K.nonEnumArgs)&&(u+="}"),u+=t.c+";return C",r=r("i,j,l,n,o,q,t,u,y,z,w,G,H,J",e+u+"}"),n(t),r(_,z,R,a,U,l,X,o,D,P,V,A,N,M)}function a(t){return M.call(t)==j
}function c(t,n,u,i,l,s){var p=u===b;if(typeof u=="function"&&!p){u=o.createCallback(u,i,2);var m=u(t,n);if(typeof m!="undefined")return!!m}if(t===n)return 0!==t||1/t==1/n;var h=typeof t,y=typeof n;if(t===t&&(!t||"function"!=h&&"object"!=h)&&(!n||"function"!=y&&"object"!=y))return!1;if(null==t||null==n)return t===n;if(y=M.call(t),h=M.call(n),y==j&&(y=w),h==j&&(h=w),y!=h)return!1;switch(y){case O:case E:return+t==+n;case x:return t!=+t?n!=+n:0==t?1/t==1/n:t==+n;case S:case A:return t==n+""}if(h=y==C,!h){if(R.call(t,"__wrapped__")||R.call(n,"__wrapped__"))return c(t.__wrapped__||t,n.__wrapped__||n,u,i,l,s);
if(y!=w||!K.nodeClass&&(r(t)||r(n)))return!1;var y=!K.argsObject&&a(t)?Object:t.constructor,d=!K.argsObject&&a(n)?Object:n.constructor;if(y!=d&&(!f(y)||!(y instanceof y&&f(d)&&d instanceof d)))return!1}for(d=!l,l||(l=g.pop()||[]),s||(s=g.pop()||[]),y=l.length;y--;)if(l[y]==t)return s[y]==n;var v=0,m=!0;if(l.push(t),s.push(n),h){if(y=t.length,v=n.length,m=v==t.length,!m&&!p)return m;for(;v--;)if(h=y,d=n[v],p)for(;h--&&!(m=c(t[h],d,u,i,l,s)););else if(!(m=c(t[v],d,u,i,l,s)))break;return m}return Z(n,function(r,e,n){return R.call(n,e)?(v++,m=R.call(t,e)&&c(t[e],r,u,i,l,s)):void 0
}),m&&!p&&Z(t,function(t,r,e){return R.call(e,r)?m=-1<--v:void 0}),d&&(e(l),e(s)),m}function f(t){return typeof t=="function"}function i(t){return!(!t||!P[typeof t])}function l(t){return typeof t=="string"||M.call(t)==A}function s(t,r,e){var n=[];if(r=o.createCallback(r,e),U(t)){e=-1;for(var u=t.length;++e<u;){var a=t[e];r(a,e,t)&&n.push(a)}}else Y(t,function(t,e,o){r(t,e,o)&&n.push(t)});return n}function p(t,r,e){if(r&&typeof e=="undefined"&&U(t)){e=-1;for(var n=t.length;++e<n&&false!==r(t[e],e,t););}else Y(t,r,e);
return t}function m(t){return t}var g=[],h=[],b={},y=40,d=(d=/\bthis\b/)&&d.test(function(){return this})&&d,v="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),j="[object Arguments]",C="[object Array]",O="[object Boolean]",E="[object Date]",_="[object Error]",x="[object Number]",w="[object Object]",S="[object RegExp]",A="[object String]",P={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},I=P[typeof exports]&&exports,B=P[typeof module]&&module&&module.exports==I&&module,F=P[typeof global]&&global;
!F||F.global!==F&&F.window!==F||(t=F);var z=Error.prototype,D=Object.prototype,N=String.prototype,F=RegExp("^"+(D.valueOf+"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),q=Function.prototype.toString,R=D.hasOwnProperty,$=D.propertyIsEnumerable,M=D.toString,T=F.test(T=M.bind)&&T,G=F.test(G=Object.create)&&G,H=F.test(H=Array.isArray)&&H,J=F.test(J=Object.keys)&&J,G=F.test(t.attachEvent),L=T&&!/\n|true/.test(T+G),V={};V[C]=V[E]=V[x]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0},V[O]=V[A]={constructor:!0,toString:!0,valueOf:!0},V[_]=V["[object Function]"]=V[S]={constructor:!0,toString:!0},V[w]={constructor:!0},function(){for(var t=v.length;t--;){var r,e=v[t];
for(r in V)R.call(V,r)&&!R.call(V[r],e)&&(V[r][e]=!1)}}();var K=o.support={};!function(){var t=function(){this.x=1},r=[];t.prototype={valueOf:1,y:1};for(var e in new t)r.push(e);for(e in arguments);K.argsObject=arguments.constructor==Object&&!(arguments instanceof Array),K.argsClass=a(arguments),K.enumErrorProps=$.call(z,"message")||$.call(z,"name"),K.enumPrototypes=$.call(t,"prototype"),K.fastBind=T&&!L,K.nonEnumArgs=0!=e,K.nonEnumShadows=!/valueOf/.test(r),K.unindexedChars="xx"!="x"[0]+Object("x")[0];
try{K.nodeClass=!(M.call(document)==w&&!({toString:0}+""))}catch(n){K.nodeClass=!0}}(1);var Q={a:"x,F,k",h:"var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",f:"if(typeof C[m]=='undefined')C[m]=r[m]",c:"}}"},G={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"},F={h:"if(!z[typeof r])return C;"+G.h,b:!1};K.argsClass||(a=function(t){return t?R.call(t,"callee"):!1});var U=H||function(t){return t?typeof t=="object"&&M.call(t)==C:!1
},W=u({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),X=J?function(t){return i(t)?K.enumPrototypes&&typeof t=="function"||K.nonEnumArgs&&t.length&&a(t)?W(t):J(t):[]}:W,Y=u(G),H=u(Q,{h:Q.h.replace(";",";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),f:"C[m]=d?d(C[m],r[m]):r[m]"}),Z=u(G,F,{i:!1});f(/x/)&&(f=function(t){return typeof t=="function"&&"[object Function]"==M.call(t)}),o.assign=H,o.createCallback=function(t,r,e){if(null==t)return m;
var n=typeof t;if("function"!=n){if("object"!=n)return function(r){return r[t]};var o=X(t);return function(r){for(var e=o.length,n=!1;e--&&(n=c(r[o[e]],t[o[e]],b)););return n}}return typeof r=="undefined"||d&&!d.test(q.call(t))?t:1===e?function(e){return t.call(r,e)}:2===e?function(e,n){return t.call(r,e,n)}:4===e?function(e,n,o,u){return t.call(r,e,n,o,u)}:function(e,n,o){return t.call(r,e,n,o)}},o.filter=s,o.forEach=p,o.forIn=Z,o.keys=X,o.each=p,o.extend=H,o.select=s,o.identity=m,o.isArguments=a,o.isArray=U,o.isEqual=c,o.isFunction=f,o.isObject=i,o.isString=l,o.VERSION="1.3.1",typeof define=="function"&&typeof define.amd=="object"&&define.amd?(t._=o, define(function(){return o
})):I&&!I.nodeType?B?(B.exports=o)._=o:I._=o:t._=o}(this);
})(self)
},{}],6:[function(require,module,exports){
(function(){var window = require("global/window")
var once = require("once")

var messages = {
    "0": "Internal XMLHttpRequest Error",
    "4": "4xx Client Error",
    "5": "5xx Server Error"
}

var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ?
        window.XMLHttpRequest : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    callback = once(callback)

    var xhr

    if (options.cors) {
        xhr = new XDR()
        xhr.withCredentials = true
    } else {
        xhr = new XHR()
    }

    var uri = xhr.url = options.uri
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var isJson = false

    if ("json" in options) {
        isJson = true
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(options.json)
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = load
    xhr.onerror = error
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    // hate IE
    xhr.ontimeout = noop
    xhr.open(method, uri)
    xhr.timeout = "timeout" in options ? options.timeout : 5000

    if ( xhr.setRequestHeader) {
        Object.keys(headers).forEach(function (key) {
            xhr.setRequestHeader(key, headers[key])
        })
    }

    xhr.send(body)

    return xhr

    function readystatechange() {
        if (xhr.readyState === 4) {
            load()
        }
    }

    function load() {
        var error = null
        var status = xhr.statusCode = xhr.status
        var body = xhr.body = xhr.response ||
            xhr.responseText || xhr.responseXML

        if (status === 0 || (status >= 400 && status < 600)) {
            var message = xhr.responseText ||
                messages[String(xhr.status).charAt(0)]
            error = new Error(message)

            error.statusCode = xhr.status
        }

        if (isJson) {
            try {
                body = xhr.body = JSON.parse(body)
            } catch (e) {}
        }

        callback(error, xhr, body)
    }

    function error(evt) {
        callback(evt, xhr)
    }
}


function noop() {}

})()
},{"global/window":7,"once":8}],7:[function(require,module,exports){
(function(global){if (typeof window !== "undefined") {
    module.exports = window
} else if (typeof global !== "undefined") {
    module.exports = global
} else {
    module.exports = {}
}

})(self)
},{}],8:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],9:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) lodash.com/license
 * Build: `lodash include="each,extend"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;!function(t){function r(t){return typeof t.toString!="function"&&typeof(t+"")=="string"}function e(t){t.length=0,m.length<y&&m.push(t)}function n(t){var r=t.k;r&&n(r),t.b=t.k=t.object=t.number=t.string=null,g.length<y&&g.push(t)}function o(){}function u(){var t=g.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1};t.g=d,t.b=t.c=t.f=t.h="",t.e="r",t.i=!0,t.j=!!W;for(var r,e=0;r=arguments[e];e++)for(var u in r)t[u]=r[u];
e=t.a,t.d=/^[^,]+/.exec(e)[0],r=Function,e="return function("+e+"){",u="var m,r="+t.d+",C="+t.e+";if(!r)return C;"+t.h+";",t.b?(u+="var s=r.length;m=-1;if("+t.b+"){",V.unindexedChars&&(u+="if(q(r)){r=r.split('')}"),u+="while(++m<s){"+t.f+";}}else{"):V.nonEnumArgs&&(u+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+t.f+";}}else{"),V.enumPrototypes&&(u+="var E=typeof r=='function';"),V.enumErrorProps&&(u+="var D=r===j||r instanceof Error;");var c=[];if(V.enumPrototypes&&c.push('!(E&&m=="prototype")'),V.enumErrorProps&&c.push('!(D&&(m=="message"||m=="name"))'),t.i&&t.j)u+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}";
else if(u+="for(m in r){",t.i&&c.push("l.call(r, m)"),c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}",V.nonEnumShadows){for(u+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];",k=0;7>k;k++)u+="m='"+t.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",t.i||(u+="||(!v[m]&&r[m]!==y[m])"),u+="){"+t.f+"}";u+="}"}return(t.b||V.nonEnumArgs)&&(u+="}"),u+=t.c+";return C",r=r("i,j,l,n,o,q,t,u,y,z,w,G,H,J",e+u+"}"),n(t),r(E,F,q,a,Q,l,W,o,z,A,L,S,D,$)}function a(t){return $.call(t)==v
}function c(t,n,u,i,l,s){var p=u===h;if(typeof u=="function"&&!p){u=o.createCallback(u,i,2);var g=u(t,n);if(typeof g!="undefined")return!!g}if(t===n)return 0!==t||1/t==1/n;var y=typeof t,b=typeof n;if(t===t&&(!t||"function"!=y&&"object"!=y)&&(!n||"function"!=b&&"object"!=b))return!1;if(null==t||null==n)return t===n;if(b=$.call(t),y=$.call(n),b==v&&(b=x),y==v&&(y=x),b!=y)return!1;switch(b){case O:case C:return+t==+n;case _:return t!=+t?n!=+n:0==t?1/t==1/n:t==+n;case w:case S:return t==n+""}if(y=b==j,!y){if(q.call(t,"__wrapped__")||q.call(n,"__wrapped__"))return c(t.__wrapped__||t,n.__wrapped__||n,u,i,l,s);
if(b!=x||!V.nodeClass&&(r(t)||r(n)))return!1;var b=!V.argsObject&&a(t)?Object:t.constructor,d=!V.argsObject&&a(n)?Object:n.constructor;if(b!=d&&(!f(b)||!(b instanceof b&&f(d)&&d instanceof d)))return!1}for(d=!l,l||(l=m.pop()||[]),s||(s=m.pop()||[]),b=l.length;b--;)if(l[b]==t)return s[b]==n;var E=0,g=!0;if(l.push(t),s.push(n),y){if(b=t.length,E=n.length,g=E==t.length,!g&&!p)return g;for(;E--;)if(y=b,d=n[E],p)for(;y--&&!(g=c(t[y],d,u,i,l,s)););else if(!(g=c(t[E],d,u,i,l,s)))break;return g}return Y(n,function(r,e,n){return q.call(n,e)?(E++,g=q.call(t,e)&&c(t[e],r,u,i,l,s)):void 0
}),g&&!p&&Y(t,function(t,r,e){return q.call(e,r)?g=-1<--E:void 0}),d&&(e(l),e(s)),g}function f(t){return typeof t=="function"}function i(t){return!(!t||!A[typeof t])}function l(t){return typeof t=="string"||$.call(t)==S}function s(t,r,e){if(r&&typeof e=="undefined"&&Q(t)){e=-1;for(var n=t.length;++e<n&&false!==r(t[e],e,t););}else X(t,r,e);return t}function p(t){return t}var m=[],g=[],h={},y=40,b=(b=/\bthis\b/)&&b.test(function(){return this})&&b,d="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),v="[object Arguments]",j="[object Array]",O="[object Boolean]",C="[object Date]",E="[object Error]",_="[object Number]",x="[object Object]",w="[object RegExp]",S="[object String]",A={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},P=A[typeof exports]&&exports,I=A[typeof module]&&module&&module.exports==P&&module,B=A[typeof global]&&global;
!B||B.global!==B&&B.window!==B||(t=B);var F=Error.prototype,z=Object.prototype,D=String.prototype,B=RegExp("^"+(z.valueOf+"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),N=Function.prototype.toString,q=z.hasOwnProperty,R=z.propertyIsEnumerable,$=z.toString,M=B.test(M=$.bind)&&M,T=B.test(T=Object.create)&&T,G=B.test(G=Array.isArray)&&G,H=B.test(H=Object.keys)&&H,T=B.test(t.attachEvent),J=M&&!/\n|true/.test(M+T),L={};L[j]=L[C]=L[_]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0},L[O]=L[S]={constructor:!0,toString:!0,valueOf:!0},L[E]=L["[object Function]"]=L[w]={constructor:!0,toString:!0},L[x]={constructor:!0},function(){for(var t=d.length;t--;){var r,e=d[t];
for(r in L)q.call(L,r)&&!q.call(L[r],e)&&(L[r][e]=!1)}}();var V=o.support={};!function(){var t=function(){this.x=1},r=[];t.prototype={valueOf:1,y:1};for(var e in new t)r.push(e);for(e in arguments);V.argsObject=arguments.constructor==Object&&!(arguments instanceof Array),V.argsClass=a(arguments),V.enumErrorProps=R.call(F,"message")||R.call(F,"name"),V.enumPrototypes=R.call(t,"prototype"),V.fastBind=M&&!J,V.nonEnumArgs=0!=e,V.nonEnumShadows=!/valueOf/.test(r),V.unindexedChars="xx"!="x"[0]+Object("x")[0];
try{V.nodeClass=!($.call(document)==x&&!({toString:0}+""))}catch(n){V.nodeClass=!0}}(1);var K={a:"x,F,k",h:"var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",f:"if(typeof C[m]=='undefined')C[m]=r[m]",c:"}}"},T={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"},B={h:"if(!z[typeof r])return C;"+T.h,b:!1};V.argsClass||(a=function(t){return t?q.call(t,"callee"):!1});var Q=G||function(t){return t?typeof t=="object"&&$.call(t)==j:!1
},U=u({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),W=H?function(t){return i(t)?V.enumPrototypes&&typeof t=="function"||V.nonEnumArgs&&t.length&&a(t)?U(t):H(t):[]}:U,X=u(T),G=u(K,{h:K.h.replace(";",";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),f:"C[m]=d?d(C[m],r[m]):r[m]"}),Y=u(T,B,{i:!1});f(/x/)&&(f=function(t){return typeof t=="function"&&"[object Function]"==$.call(t)}),o.assign=G,o.createCallback=function(t,r,e){if(null==t)return p;
var n=typeof t;if("function"!=n){if("object"!=n)return function(r){return r[t]};var o=W(t);return function(r){for(var e=o.length,n=!1;e--&&(n=c(r[o[e]],t[o[e]],h)););return n}}return typeof r=="undefined"||b&&!b.test(N.call(t))?t:1===e?function(e){return t.call(r,e)}:2===e?function(e,n){return t.call(r,e,n)}:4===e?function(e,n,o,u){return t.call(r,e,n,o,u)}:function(e,n,o){return t.call(r,e,n,o)}},o.forEach=s,o.forIn=Y,o.keys=W,o.each=s,o.extend=G,o.identity=p,o.isArguments=a,o.isArray=Q,o.isEqual=c,o.isFunction=f,o.isObject=i,o.isString=l,o.VERSION="1.3.1",typeof define=="function"&&typeof define.amd=="object"&&define.amd?(t._=o, define(function(){return o
})):P&&!P.nodeType?I?(I.exports=o)._=o:P._=o:t._=o}(this);
})(self)
},{}]},{},[1])(1)
});
;