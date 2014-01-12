enyo.kind({
    name: 'db.IDBApp',
    kind: 'enyo.Application',
    autoStart: false,
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
    ],

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
    }),

    view: 'db.IDBView',
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



        return false;
    },
    initSchema: function(error, db, oldVer, newVer) {
        if (error) {
            this.error('Failed to open IndexedDB:', error);
            return;
        }

        // Create 'user' store if doesn't exist
        if (!db.objectStoreNames.contains('user')) {
            db.createObjectStore('user', {keyPath: 'id', autoIncrement: true});
        }
    }
});

enyo.kind({
    name: 'db.IDBUser',
    kind: 'enyo.Model',
    url: 'user'
});

enyo.ready(function() {
    new db.IDBApp().renderInto(document.body);
});