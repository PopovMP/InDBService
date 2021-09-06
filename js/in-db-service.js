// noinspection JSUnresolvedVariable,ES6ConvertVarToLetConst,JSUnusedGlobalSymbols
class InDbService {
    constructor() {
    }
    /**
     * Opens an IndexedDB. Creates or upgrades it if necessary.
     *
     * @param {InDBScheme} scheme
     * @param {function(err: string|null, dbName: string|null): void} callback
     *
     * @return {void}
     */
    openDB(scheme, callback) {
        if (typeof window.indexedDB !== 'object') {
            callback('Indexed DB is not supported!', null);
            return;
        }
        const request = window.indexedDB.open(scheme.name, scheme.version || 1);
        request.onsuccess = (event) => {
            this.db = event.target.result;
            callback(null, this.db.name);
        };
        request.onerror = (event) => {
            var _a;
            callback(((_a = event.target.error) === null || _a === void 0 ? void 0 : _a.message) || 'Something went wrong!', null);
        };
        request.onupgradeneeded = (event) => {
            this.db = event.target.result;
            InDbService.upgradeDatabase(this.db, scheme);
        };
    }
    /**
     * Closes the DB
     *
     * @return {void}
     */
    closeDB() {
        if (this.db) {
            this.db.close();
        }
    }
    /**
     * Gets the estimate storage usage
     *
     * @param {function(usage: object)} callback
     *
     * @return {void}
     */
    estimateUsage(callback) {
        navigator.storage.estimate().then(callback);
    }
    /**
     * Adds a document to the DB.
     *
     * The document must not exist.
     * Use `putData` to add or update a document.
     *
     * @param {string} storeName
     * @param {object} data
     * @param {function(err: string|null, key: string|null): void} callback
     *
     * @return {void}
     */
    addData(storeName, data, callback) {
        const options = {
            storeName,
            data,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'add',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Adds or updates a document.
     *
     * @param {string} storeName
     * @param {object}  data
     * @param {function(err: string|null, key: string|null): void} callback
     *
     * @return {void}
     */
    putData(storeName, data, callback) {
        const options = {
            storeName,
            data,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'put',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Gets a document from DB.
     *
     * @param {string} storeName
     * @param {string}  key
     * @param {function(err: string|null, document: object|null): void} callback
     *
     * @return {void}
     */
    getData(storeName, key, callback) {
        const options = {
            storeName,
            data: undefined,
            keyPath: key,
            mode: 'readonly',
            actionTag: 'get',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Deletes a document from DB.
     *
     * @param {string} storeName
     * @param {string}  key
     * @param {function(err: string|null): void} callback
     *
     * @return {void}
     */
    deleteData(storeName, key, callback) {
        const options = {
            storeName,
            data: undefined,
            keyPath: key,
            mode: 'readwrite',
            actionTag: 'delete',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Removes all documents from a store.
     *
     * @param {string} storeName
     * @param {function(err: string|null): void} callback
     *
     * @return {void}
     */
    clearStore(storeName, callback) {
        const options = {
            storeName,
            data: undefined,
            keyPath: '',
            mode: 'readwrite',
            actionTag: 'clear',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Gets the count of documents ina store.
     *
     * @param {string} storeName
     * @param {function(err: string|null, count: number|null): void} callback
     *
     * @return {void}
     */
    countData(storeName, callback) {
        const options = {
            storeName,
            data: undefined,
            keyPath: '',
            mode: 'readonly',
            actionTag: 'count',
        };
        this.dbRequest(options, callback);
    }
    getKeys(storeName, keysRange, callback) {
        const options = {
            storeName,
            data: keysRange,
            keyPath: '',
            mode: 'readonly',
            actionTag: 'getKeys',
        };
        this.dbRequest(options, callback);
    }
    /**
     * Prunes DB by removing the oldest data.
     * It leaves the required newest count of data.
     */
    removeOldData(options, callback) {
        const self = this;
        // Count all data
        this.countData(options.storeName, count_ready);
        function count_ready(err, count) {
            if (err) {
                callback(err, 0);
                return;
            }
            // Check if there are objects to remove
            if (count <= options.countToLeave) {
                callback(null, 0);
                return;
            }
            const keysRange = {
                index: options.index,
                count: count - options.countToLeave
            };
            // Get the IDs of the data to be removed
            self.getKeys(options.storeName, keysRange, getKeys_ready);
        }
        function getKeys_ready(err, data) {
            if (err) {
                callback(err, 0);
                return;
            }
            loop(data.map((e) => e[options.keyPath]));
        }
        function loop(ids, countRemoved = 0) {
            if (ids.length === 0) {
                callback(null, countRemoved);
                return;
            }
            // Deletes an document from `storeName` with a specified ID
            self.deleteData(options.storeName, ids[0], deleteData_ready);
            function deleteData_ready(err) {
                if (err) {
                    callback(err, countRemoved);
                    return;
                }
                loop(ids.slice(1), countRemoved + 1);
            }
        }
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
        const store = transaction.objectStore(options.storeName);
        let request;
        switch (options.actionTag) {
            case 'add':
                request = store.add(options.data);
                break;
            case 'clear':
                request = store.clear();
                break;
            case 'count':
                request = store.count();
                break;
            case 'delete':
                request = store.delete(options.keyPath);
                break;
            case 'get':
                request = store.get(options.keyPath);
                break;
            case 'put':
                request = store.put(options.data);
                break;
            case 'getKeys':
                InDbService.dbCursor(store, options.data, callback);
                return;
            default:
                callback('Unknown operation', null);
                return;
        }
        request.onsuccess = (event) => {
            callback(null, event.target.result);
        };
        request.onerror = (event) => {
            var _a;
            callback(((_a = event.target.error) === null || _a === void 0 ? void 0 : _a.message) || 'Something went wrong!', null);
        };
    }
    static dbCursor(store, range, callback) {
        if (!store.indexNames.contains(range.index)) {
            callback(`Index '${range.index}' doesn't exist. It must be set in the DB scheme.`, null);
            return;
        }
        const query = typeof range.only !== 'undefined'
            ? IDBKeyRange.only(range.only)
            : typeof range.lower === 'undefined'
                ? undefined
                : typeof range.upper === 'undefined'
                    ? IDBKeyRange.lowerBound(range.lower, range.lowerOpen)
                    : IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
        const index = store.index(range.index);
        const request = index.openKeyCursor(query);
        const keys = [];
        const maxLength = range.count || 1000000;
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor || (!range.fromTop && keys.length >= maxLength)) {
                const data = range.fromTop
                    ? keys.slice(Math.max(keys.length - maxLength, 0))
                    : keys;
                callback(null, data);
                return;
            }
            const cursorData = {};
            cursorData[store.keyPath] = cursor.primaryKey;
            if (range.index !== store.keyPath) {
                cursorData[range.index] = cursor.key;
            }
            keys.push(cursorData);
            cursor.continue();
        };
        request.onerror = (event) => {
            var _a, _b;
            callback(((_b = (_a = event.target) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || 'Something went wrong!', null);
        };
    }
    static upgradeDatabase(db, scheme) {
        // Remove the unnecessary existing object stores
        if (db.objectStoreNames.length > 0) {
            const schemeStoresNames = scheme.objectStores.map((store) => store.name);
            const storeNamesToRemove = Array.from(db.objectStoreNames)
                .filter((storeName) => schemeStoresNames.indexOf(storeName) === -1);
            for (const name of storeNamesToRemove) {
                db.deleteObjectStore(name);
            }
        }
        // Add new stores
        for (const newStore of scheme.objectStores) {
            if (db.objectStoreNames.contains(newStore.name)) {
                continue;
            }
            const storeParameters = {
                keyPath: newStore.keyPath,
                autoIncrement: !!newStore.autoIncrement,
            };
            // Create a mew object store
            const objectStore = db.createObjectStore(newStore.name, storeParameters);
            // Create the necessary indexes
            if (newStore.indexes) {
                for (const index of newStore.indexes) {
                    objectStore.createIndex(index.name, index.name, { unique: !!index.unique });
                }
            }
        }
    }
}
