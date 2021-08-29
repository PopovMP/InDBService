"use strict";
class InDbService {
    constructor() {
    }
    openDB(dbScheme, callback) {
        if (typeof window.indexedDB !== 'object') {
            callback('Indexed DB is not supported!', null);
            return;
        }
        const request = window.indexedDB.open(dbScheme.name, dbScheme.version);
        request.onupgradeneeded = this.openDBRequest_upgradeNeeded.bind(this, dbScheme);
        request.onsuccess = this.openDBRequest_success.bind(this, callback);
        request.onerror = this.openDBRequest_error.bind(this, callback);
    }
    estimateUsage(callback) {
        navigator.storage.estimate().then(callback);
    }
    addData(storeName, data, callback) {
        const options = {
            storeName: storeName,
            data: data,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'add',
        };
        this.dbRequest(options, callback);
    }
    putData(storeName, data, callback) {
        const options = {
            storeName: storeName,
            data: data,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'put',
        };
        this.dbRequest(options, callback);
    }
    getData(storeName, key, callback) {
        const options = {
            storeName: storeName,
            data: undefined,
            keyPath: key,
            mode: 'readonly',
            actionTag: 'get',
        };
        this.dbRequest(options, callback);
    }
    deleteData(storeName, key, callback) {
        const options = {
            storeName: storeName,
            data: undefined,
            keyPath: key,
            mode: 'readwrite',
            actionTag: 'delete',
        };
        this.dbRequest(options, callback);
    }
    clearStore(storeName, callback) {
        const options = {
            storeName: storeName,
            data: undefined,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'clear',
        };
        this.dbRequest(options, callback);
    }
    countData(storeName, callback) {
        const options = {
            storeName: storeName,
            data: undefined,
            keyPath: '',
            mode: 'readonly',
            actionTag: 'count',
        };
        this.dbRequest(options, callback);
    }
    getKeys(storeName, keysRange, callback) {
        const options = {
            storeName: storeName,
            data: keysRange,
            keyPath: '',
            mode: 'readonly',
            actionTag: 'getKeys',
        };
        this.dbRequest(options, callback);
    }
    dbRequest(options, callback) {
        if (!this.db) {
            callback('Indexed DB is not open!', null);
            return;
        }
        if (!this.db.objectStoreNames.contains(options.storeName)) {
            callback('Cannot find store named: ' + options.storeName, null);
            return;
        }
        const transaction = this.db.transaction(options.storeName, options.mode);
        transaction.onerror = function (event) {
            callback(event.target.error.message, null);
        };
        const objectStore = transaction.objectStore(options.storeName);
        let request;
        switch (options.actionTag) {
            case 'add':
                request = objectStore.add(options.data);
                break;
            case 'clear':
                request = objectStore.clear();
                break;
            case 'count':
                request = objectStore.count();
                break;
            case 'delete':
                request = objectStore.delete(options.keyPath);
                break;
            case 'get':
                request = objectStore.get(options.keyPath);
                break;
            case 'getKeys':
                this.dbCursor(objectStore, options.data, callback);
                return;
            case 'put':
                request = objectStore.put(options.data);
                break;
            default:
                callback('Unknown operation', null);
                return;
        }
        request.onerror = function (event) {
            callback(event.target.error.message, null);
        };
        request.onsuccess = function (event) {
            callback(null, event.target.result);
        };
    }
    dbCursor(objectStore, range, callback) {
        const query = typeof range.only !== 'undefined'
            ? IDBKeyRange.only(range.only)
            : typeof range.upper === 'undefined'
                ? IDBKeyRange.lowerBound(range.lower || 0, range.lowerOpen)
                : IDBKeyRange.bound(range.lower || 0, range.upper, range.lowerOpen, range.upperOpen);
        const index = objectStore.index(range.index);
        const request = index.openKeyCursor(query);
        const keys = [];
        const maxLength = range.count || 1000000;
        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (!cursor || (!range.fromTop && keys.length >= maxLength)) {
                const data = range.fromTop
                    ? keys.slice(Math.max(keys.length - maxLength, 0))
                    : keys;
                callback(null, data);
                return;
            }
            const cursorData = {};
            cursorData[range.index] = cursor.key;
            cursorData[objectStore.keyPath] = cursor.primaryKey;
            keys.push(cursorData);
            cursor.continue();
        };
        request.onerror = function (event) {
            callback(event.target.error.message, null);
        };
    }
    openDBRequest_upgradeNeeded(dbScheme, event) {
        this.db = event.target.result;
        const schemeStoresNames = [];
        for (const newStore of dbScheme.objectStores) {
            schemeStoresNames.push(newStore.name);
            if (this.db.objectStoreNames.contains(newStore.name)) {
                continue;
            }
            const storeParameters = {
                keyPath: newStore.keyPath,
                autoIncrement: newStore.autoIncrement,
            };
            const objectStore = this.db.createObjectStore(newStore.name, storeParameters);
            for (const index of newStore.indexes) {
                objectStore.createIndex(index.name, index.name, { unique: index.unique });
            }
        }
        const storesToRemove = [];
        for (let i = 0; i < this.db.objectStoreNames.length; i++) {
            const storeName = this.db.objectStoreNames[i];
            if (schemeStoresNames.indexOf(storeName) === -1) {
                storesToRemove.push(storeName);
            }
        }
        for (const name of storesToRemove) {
            this.db.deleteObjectStore(name);
        }
    }
    openDBRequest_success(callback, event) {
        this.db = event.target.result;
        const storeNames = [];
        for (let i = 0; i < this.db.objectStoreNames.length; i++) {
            storeNames.push(this.db.objectStoreNames[i]);
        }
        callback(null, { name: this.db.name, version: this.db.version, storeNames: storeNames });
    }
    openDBRequest_error(callback, event) {
        callback(event.target.error.message, null);
    }
}
