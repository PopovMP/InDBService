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
        request.onupgradeneeded = this.openDB_upgradeNeeded.bind(this, dbScheme);
        request.onsuccess = this.openDB_success.bind(this, callback);
        request.onerror = this.openDB_error.bind(this, callback);
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
    getAllKeys(storeName, callback) {
        const options = {
            storeName: storeName,
            data: undefined,
            keyPath: '',
            mode: 'readonly',
            actionTag: 'getAllKeys',
        };
        this.dbRequest(options, callback);
    }
    dbRequest(options, callback) {
        let isErrorReported = false;
        if (!this.db) {
            callback('Indexed DB is not open!', null);
            return;
        }
        const transaction = this.db.transaction(options.storeName, options.mode);
        transaction.onerror = function (event) {
            if (!isErrorReported) {
                isErrorReported = true;
                callback(event.target.error.message, null);
            }
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
            case 'getAllKeys':
                request = objectStore.getAllKeys();
                break;
            case 'put':
                request = objectStore.put(options.data);
                break;
            default:
                callback('Unknown operation', null);
                return;
        }
        request.onerror = function (event) {
            var _a, _b;
            if (!isErrorReported) {
                isErrorReported = true;
                callback((_b = (_a = event === null || event === void 0 ? void 0 : event.target) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message, null);
            }
        };
        request.onsuccess = function (event) {
            var _a;
            callback(null, (_a = event === null || event === void 0 ? void 0 : event.target) === null || _a === void 0 ? void 0 : _a.result);
        };
    }
    openDB_upgradeNeeded(dbScheme, event) {
        var _a;
        this.db = (_a = event === null || event === void 0 ? void 0 : event.target) === null || _a === void 0 ? void 0 : _a.result;
        for (const schemeObjectStore of dbScheme.objectStores) {
            const options = {
                keyPath: schemeObjectStore.keyPath,
                autoIncrement: schemeObjectStore.autoIncrement,
            };
            const objectStore = this.db.createObjectStore(schemeObjectStore.name, options);
            for (const index of schemeObjectStore.indexes) {
                objectStore.createIndex(index.name, index.name, { unique: index.unique });
            }
        }
    }
    openDB_success(callback, event) {
        var _a;
        this.db = (_a = event === null || event === void 0 ? void 0 : event.target) === null || _a === void 0 ? void 0 : _a.result;
        callback(null, { name: this.db.name, version: this.db.version });
    }
    openDB_error(callback, event) {
        callback(event.target.error.message, null);
    }
}
