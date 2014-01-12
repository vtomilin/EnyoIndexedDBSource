/**
  Implements enyo.Source with underlying IndexedDB.

  A global signal event, 'onIDBOpened' is fired when database is initialized
  and ready for use, or if its initialization failed, in which case the event
  will have 'error' property set to a particular error. If database has been
  successfully opened, then the event will contain a 'db' property, which holds
  the IDBDatabase object.

  ***TODO: elaborate, provide examples***
 */
enyo.kind({
    name: 'indexeddb.Source',
    kind: 'enyo.Source',

    /**
      Initializes an instance of IndexedDBSource using given arguments.

      Parameters
      ----------
      + _props.dbName_      Database name, required
      + _props.dbVersion_   Optional database version. If greater than existing
                            version will trigger `versionchange` transaction.
      + _props.dbInitSchema_ Optional callback to configure database
      objects when `versionchange` transaction occurs. The callback will be
      invoked with one or multiple arguments. In case of an error, the callback
      will be invoked with a single argument, which will contain the error
      object. Otherwise, the callback will be invoked with four arguments,
      first being null, second being a IDBDatabase, third and fourth being old
      and new database version numbers.
     */
    constructor: enyo.inherit(function(sup) {
        return function(props) {
            var w = window,
            indexedDB = w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB ||
                        w.msIndexedDB,
            req,
            reqArgs = [props && props.dbName],
            cb = props && typeof(props.dbInitSchema) === 'function'
                ? props.dbInitSchema : function() {},
            self = this;

            if (!indexedDB) {
                throw "IndexedDB is not supported by your browser"
            }

            if (!(props && props.dbName)) {
                throw "'dbName' property is required"
            }

            if (Number(props && props.dbVersion)) {
                reqArgs.push(props.dbVersion);
            }

            req = indexedDB.open.apply(indexedDB, reqArgs);
            req.onsuccess = function(event) {
                self._db = req.result;
                enyo.Signals.send('onIDBOpened', {db: req.result});
            };
            req.onerror = function(event) {
                cb(req.error);
                enyo.Signals.send('onIDBOpened', {error: req.error});
            };
            req.onupgradeneeded = function(event) {
                cb(null, req.result, event.oldVersion, event.newVersion);
            }

            sup.apply(this, arguments);
        }
    }),

    //------------------------------------------ Abstract methods implementation
    /**
      Fetches records from the source, calls opts.success if succeeded, or
      opts.fail otherwise. Whether success or fail, both are called with
      original rec, opts, and response objects, whereby response will represent
      an array of records fetched or error object.

      Parameters
      ----------
       + _opts.params.index_ is an optional index name to use in the object store.
       If not specified, a default key(primary) will be used.
       + _opts.params.key_  is an optional key or key range. If the key is a simple value
       then it is used directly to locate records, which match it. The key range
       is defined by an object, which should define appropriate properties:
            * _lower_ key's lower bound value. If not defined, then the key
              range is unbound from the lower end.
            * _upper_ key's upper bound value. If not defined, then the key
              range is unbound from the upper end.
            __NOTE__ at least one, `lower` or `upper` property must be given.
            * _lowerOpen_ optional boolean indicating whether records, which
            match _lower_ key should be excluded from the result set.
            * _upperOpen_ optional boolean indicating whether records, which
            match _upper_ key should be excluded from the result set.
       + _opts.params.singleItem_ optional boolean(defaults to false), specifying
         whether a single record is requested. This could be useful for efficiency
         reasons, when pulling out an object by its primary key. If this option
         is given, other options are ignored except `key` and `index`.
       + _opts.params.direction_ optional direction string of dataset traversal,
         which will determine the order, which records will be returned at.
         Possible values are:
            * _next_ this is the default
            * _prev_ the dataset will be traversed in reverse
            * _nextunique_
            * _prevunique_
       + _opts.params.offset_   optional offset in result set to return values
                                from.
       + _opts.params.limit_    optional number of records to return.

      __NOTE__ that rec.url(which is your Collection or Model 'url' property)
      will be used to infer underlying object store to operate on.
     */
    fetch: function (rec, opts) {
        var m = '[indexeddb.Source.fetch]',
            storeName = indexeddb.Source._storeNameFromUrl(rec.url),
            transaction,
            store,
            params = (opts && opts.params) || {},
            index = params.index,
            key = params.key,
            keyRange,
            advanced = false,
            direction = params.direction || 'next',
            offset = Math.floor(params.offset) || 0,
            limit = Math.floor(params.limit),
            fail = indexeddb.Source._generateCallback('fail', opts, m),
            success = indexeddb.Source._generateCallback('success', opts, m),
            res = [];

        if (!storeName) {
            fail(rec, opts, m + ' Could not determine object store name. '+
                 "Did you define 'url' property in your model or collection?");
            return;
        }

        if (key) {
            keyRange = indexeddb.Source._createKeyRange(key);
            if (!keyRange) {
                fail(rec, opts, m + "Couldn't determine key range. Have you " +
                     "given a valid options.params.key?");
                return;
            }
        }

        transaction = this._db.transaction(storeName);
        transaction.onabort = function() {
            fail(transaction.error);
        };
        transaction.oncomplete = function() {
            success(res);
        };

        store = transaction.objectStore(storeName);
        if (index && store.indexNames.contains(index)) {
            // Replace store with index as now we're operating on it rather
            store = store.index(index);
        }

        // Take a shortcut if only one item has been requested
        if (params.singleItem) {
            store.get(key).onsuccess = function(e) {
                if (e.target.result) {
                    res.push(e.target.result);
                }
            };

            return;
        }

        // Else open a cursor and iterate through all applicable items
        store.openCursor(keyRange, direction).onsuccess = function(e) {
            var cursor = e.target.result;
            if (cursor) {
                // We should advance only first time around
                if (offset && !advanced) {
                    cursor.advance(offset);
                    advanced = true;
                }

                res.push(cursor.value);
                // Move on(cusror.continue() will cause onsuccess to be executed
                // again)
                cursor.continue();
            }
        };

    },
    /**
     Adds or updates given record to underlying IndexedDB.
     */
    commit: function (rec, opts) {
        var m = '[indexeddb.Source.commit]',
            storeName = indexeddb.Source._storeNameFromUrl(rec.url),
            transaction,
            store,
            fail = indexeddb.Source._generateCallback('fail', opts, m),
            success = indexeddb.Source._generateCallback('success', opts, m),
            recordIsNew = rec.isNew;

        if (!storeName) {
            fail(rec, opts, m + ' Could not determine object store name. '+
                 "Did you define 'url' property in your model or collection?");
            return;
        }

        transaction = this._db.transaction(storeName, 'readwrite');
        transaction.onabort = function() {
            fail(transaction.error);
        };
        transaction.oncomplete = function() {
            success();
        };

        store = transaction.objectStore(storeName);
        store.put(rec.raw()).onsuccess = function(e) {
            var pk = e.target.result;
            if (pk && recordIsNew && rec.primaryKey) {
                rec.attributes[rec.primaryKey] = pk;
            }
        }
    },
    /**
     Deletes given record from the object store, identified by record's URL.
     If record does not define a primary key, then finds and deletes first
     record, which has all properties matching verbatim.
     */
    destroy: function (rec, opts) {
        var m = '[indexeddb.Source.destroy]',
            storeName = indexeddb.Source._storeNameFromUrl(rec.url),
            transaction,
            store,
            hasPK = !!rec.primaryKey,
            key,
            data = rec.raw(),
            args = [],
            fail = indexeddb.Source._generateCallback('fail', opts, m),
            success = indexeddb.Source._generateCallback('success', opts, m);

        if (!storeName) {
            fail(rec, opts, m + ' Could not determine object store name. '+
                 "Did you define 'url' property in your model or collection?");
            return;
        }

        transaction = this._db.transaction(storeName, 'readwrite');
        transaction.onabort = function() {
            fail(transaction.error);
        };
        transaction.oncomplete = function() {
            success();
        };

        store = transaction.objectStore(storeName);
        if (hasPK) {
            key = indexeddb.Source._createKeyRange(rec.get(rec.primaryKey));
            if (key) {
                args.push(key);
            }
        }
        store.openCursor.apply(store, args).onsuccess = function(e) {
            var cursor = e.target.result;
            if (cursor) {
                if (hasPK || indexeddb.Source._isIdentical(cursor.value, data)) {
                    cursor.delete();
                }

                cursor.continue();
            }
        };
    },
    find: function (kind, opts) {
        // TODO
        throw "[indexeddb.Source.find] Not implemented";
    },
    //---------------------------------------------------------- Private helpers
    protectedStatics: {
        //*@private
        /**
         Creates and returns IDBKeyRange object appropriate to given _key_'s value.
         Returns `null` if _key_ is invalid.
         */
        _createKeyRange: function(key) {
            var w = window,
                IDBKeyRange = w.IDBKeyRange || w.webkitIDBKeyRange  ||
                              w.mozIDBKeyRange || w.msIDBKeyRange;
            if (typeof key === 'object') {
                if (!(key.lower || key.upper)) {
                    return null;
                }

                if (key.lower && !key.upper) {
                    return IDBKeyRange.lowerBound(key.lower, !!key.lowerOpen);
                }

                if (key.upper && !key.lower) {
                    return IDBKeyRange.upperBound(key.upper, !!key.upperOpen);
                }

                if (key.lower && key.upper) {
                    return IDBKeyRange.bound(key.lower, key.upper, !!key.lowerOpen,
                                            !!key.upperOpen);
                }
            }

            return IDBKeyRange.only(key);
        },
        //*@private
        /**
         Extracts object store name from given URL and returns it. Returns false
         if URL is not of string value.
         */
        _storeNameFromUrl: function(url) {
            return url && url.split('/').pop();
        },
        //*@private
        /**
         Returns true if object _a_ is identical to _b_, i.e. value of each
         _a's_ primitive property equals that of b. Returns false otherwise. Also
         returns false if any of the object is null or undefined. If both are
         undefined or null, returns true.
         */
        _isIdentical: function(a, b) {
            var aProps, bProps;
            if ((a === b) || (a === undefined && b === null) ||
                    (b === undefined && a === null)) {
                return true;
            }
            if ((a && !b) || (!a && b) ||
                    (typeof a === 'object' && typeof b !== 'object') ||
                    (typeof b === 'object' && typeof a !== 'object')) {
                return false;
            }

            aProps = Object.keys(a);
            bProps = Object.keys(b);

            if (aProps.length !== bProps.length) {
                return false;
            }

            if (!aProps.every(function(p) {
                        if (bProps.indexOf(p) === -1) {
                            return false;
                        }

                        return indexeddb.Source._isIdentical(a[p], b[p]);
                    })) {
                return false;
            }

            return true;
        },
        _generateCallback: function(type, opts, whatToSay) {
            var t = type || 'success',
                f = typeof opts === 'object' && typeof opts[t] === 'function'
                    ? opts[t] : function(rs) {
                        if (t === 'success') {
                            console.log(whatToSay, '(Success):', rs);
                        } else {
                            console.error(whatToSay, '(Fail):', rs);
                        }
                    };
            return f;
        }
    }
});