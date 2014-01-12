Installation
------------
_indexeddb.Source_ is installed into your project's lib directory, much like
any other Enyo plugin, for example _layout_ or _onyx_. [See this post in Enyo Wiki for details](https://github.com/enyojs/enyo/wiki/Managing-Your-Project).

Generally, you want to add _indexeddb.Source_ plugin as a git submodule of your
project, placed under _lib/indexeddb_ directory.

One way to do that is to run the following at your project's root directory:

    git submodule add https://github.com/vtomilin/EnyoIndexedDBSource.git lib/indexeddb


Then you should add _indexeddb.Source_ dependency to your top-level _package.js_
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
Create an instance of _indexeddb.Source_ sometime during your Applicaiton
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
  
A global signal event, 'onIDBOpened' will be fired when database is initialized
and ready for use, or if its initialization failed, in which case the event
will have 'error' property set to a particular error. If database has been
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
    
In the above example `this.$.users` is _enyo.Collection_ object, configured in
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

Further, you simply use data management methods(fetch, commit, destroy),
provided by Enyo's data framework.


Also see _samples_ directory for examples.