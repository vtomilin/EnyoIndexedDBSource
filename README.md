Installation
------------
`indexeddb.Source` is installed into your project's lib directory, much like
any other Enyo plugin, for example `layout` or `onyx`. [See this post in Enyo Wiki for details](https://github.com/enyojs/enyo/wiki/Managing-Your-Project).

Generally, you want to add `indexeddb.Source` plugin as a git submodule of your
project, placed under `lib/indexeddb` directory.

One way to do that is to run the following at your project's root directory:

    git submodule add https://github.com/vtomilin/EnyoIndexedDBSource.git lib/indexeddb


Then you should add `indexeddb.Source` dependency to your top-level `package.js`
file:

```javascript
enyo.depends(
    '$lib/layout',
    '$lib/onyx',
    '$lib/indexeddb',
    // Other dependencies...
);
```

Usage
------
Create an instance of `indexeddb.Source` sometime during your Applicaiton
startup and introduce it to enyo.store:

```javascript
create: enyo.inherit(function(sup) {
    return function() {
        var idbSource;
        sup.apply(this, arguments);

        try {
            idbSource = new indexeddb.Source({
                dbName: 'users',
                dbVersion: 1,
                dbInitSchema: this.initSchema.bind(this)
            });

            enyo.store.addSources({
                'idb': idbSource
            });
        } catch(error) {
            this.error('Failed to initialize IDB:', error);
        }
    };
})
```
  
A global signal event, `onIDBOpened` will be fired when database is initialized
and ready for use, or if its initialization failed, in which case the event
will have `error` property set to a particular error. If database has been
successfully opened, then the event will contain a 'db' property, which holds
the IDBDatabase object.

```javascript
onIDBReady: function(sender, event) {
    if (event.error) {
        this.error('Failed to initialize IndexedDB:', event.error);
        return true;
    }

    this.$.users.fetch({
        source: 'idb',
        success: function(rec, opts, res) {
            this.log('Great success, starting...');
            this.start();
        }.bind(this),
        fail: function(rec, opts, error) {
            this.error(error);
        }.bind(this)
    });


    return true;
}
```
    
In the above example `this.$.users` is `enyo.Collection` object, configured in
the sample application:

```javascript
components: [
    {
        kind: 'enyo.Signals', onIDBOpened: 'onIDBReady'
    },
    {
        name: 'users',
        kind: 'enyo.Collection',
        model: 'db.IDBUser',
        url: 'user'
    }
]
```

Further, you simply use data management methods(`fetch`, `commit`, `destroy`),
provided by Enyo's data framework(`enyo.Collection`, `enyo.Model`).

Whereas `commit` and `destroy` generally do not require additional options,
`fetch` frequently does. These are options, which control its behavior:

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

__NOTE__ that rec.url(which is your `Collection` or `Model` `url` property)
will be used to infer underlying object store to operate on.


Also see `samples` directory for examples.

&copy; Vitaly Tomilin

*Licensed under LGPL v3*