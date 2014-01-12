Installation
------------
TODO

Usage
------
Create an instance of _indexeddb.Source_ sometime during your Applicaiton
startup and introduce it to enyo.store:
  
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
  
A global signal event, 'onIDBOpened' will be fired when database is initialized
and ready for use, or if its initialization failed, in which case the event
will have 'error' property set to a particular error. If database has been
successfully opened, then the event will contain a 'db' property, which holds
the IDBDatabase object.

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
    
In the above example `this.$.users` is _enyo.Collection_ object, configured in
the sample application:

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