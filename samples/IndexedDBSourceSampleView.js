enyo.kind({
    name: 'db.IDBView',
    classes: 'onyx',
    handlers: {
        onEditUser: 'editUser',
        onDeleteUser: 'deleteUser'
    },
    components: [
        {
            components: [
                {
                    
                    kind: "onyx.InputDecorator",
                    components: [
                        {
                            name: 'name',
                            kind: 'onyx.Input'
                        }
                    ]
                },
                {
                    kind: "onyx.InputDecorator",
                    components: [
                        {
                            name: 'password',
                            kind: 'onyx.Input',
                            type: 'password'
                        }
                    ]
                }
            ]
        },
        {
            components: [
                {
                    name: 'reset',
                    kind: 'onyx.Button',
                    content: 'Reset',
                    ontap: 'resetUser'
                },
                {
                    name: 'save',
                    kind: 'onyx.Button',
                    content: 'Save',
                    ontap: 'saveUser'
                }
            ]
        },
        {
            name: "repeater",
            kind: "enyo.DataList",
            selection: false,
            components: [
                {
                    components: [
                        {
                            name: 'user',
                            kind: 'db.UserView'
                        }
                    ],
                    bindings: [
                        {from: ".model", to: ".$.user.model"}
                    ]
                }
            ]
        }
    ],
    bindings: [
        {from: '.app.$.users', to: '.$.repeater.collection'},
        {from: '.model.name', to: '.$.name.value'},
        {from: '.model.password', to: '.$.password.value'}
    ],
    editUser: function(sender, event) {
        this.set('model', event);
    },
    saveUser: function(sender, event) {
        var user = this.get('model'),
            name = this.$.name.value.trim(),
            password = this.$.password.value.trim(),
            isUserNew = !user;
        
        if (!name || !password) {
            return true;
        }
        
        if (!user) {
            // 1. try model constructor
            user = new db.IDBUser({
                name: name,
                password: password
            });
        } else {
            user.set('name', name);
            user.set('password', password);
        }
        
        user.commit({
            source: 'idb',
            success: function(rec, opts, res) {
                // Now add to the collection if new
                if (isUserNew) {
                    this.get('.app.$.users').add(user);
                }
            }.bind(this),
            fail: function(rec, opts, res) {
                this.error('Failed to commit a user:', res);
            }.bind(this)
        });

        
        return true;
    },
    deleteUser: function(sender, event) {
        var user = event;
        
        this.get('.app.$.users').remove(user);
        
        user.destroy({
            source: 'idb',
            success: function() {
                enyo.log('Deleted record');
            },
            fail: function(r, o, e) {
                enyo.error('Failed to delete a record:', e);
            }
        })
    }
});

enyo.kind({
    name: 'db.UserView',
    events: {
        onEditUser: '',
        onDeleteUser: ''
    },
    components: [
        {
            components: [
                {
                    tag: 'label',
                    content: 'User name '
                },
                {
                    name: 'name',
                    tag: 'span'
                },
                {
                    tag: 'label',
                    content: 'Password '
                },
                {
                    name: 'password',
                    tag: 'span'
                }
            ],
            ontap: 'editUser'
        },
        {
            kind: 'onyx.Button',
            content: 'X',
            ontap: 'deleteUser'
        }
    ],
    bindings: [
        {from: '.name', target: '.$.name'},
        {from: '.password', target: '.$.password'}
    ],
    bindingDefaults: {
        source: '.model',
        to: '.content'
    },
    editUser: function(sender, event) {
        this.doEditUser(this.model);
    },
    deleteUser: function(sender, event) {
        this.doDeleteUser(this.model);
    }
});