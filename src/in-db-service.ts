// noinspection JSUnresolvedVariable,ES6ConvertVarToLetConst,JSUnusedGlobalSymbols

type InDBCallback = (err: string | null, data?: any | null) => void

type InDBIndex = {
	name   : string,
	unique?: boolean, // Defaults to false
}

type InDBObjectStore = {
	name          : string,
	keyPath       : string,
	autoIncrement?: boolean,     // Defaults to false
	indexes?      : InDBIndex[], // Defaults to [{name: keyPath, unique: true}]
}

type InDBScheme = {
	name        : string,
	version?    : number, // Defaults to 1
	objectStores: InDBObjectStore[],
}

type InDBRequestOptions = {
	storeName: string,
	data     : any,
	keyPath  : IDBValidKey,
	mode     : IDBTransactionMode,
	actionTag: string,
}

type InDBKeysRange = {
	index     : string,          // Document field to query
	only?     : number | string, // Take documents with index = only
	lower?    : number | string, // The lower bound of the range
	upper?    : number | string, // The upper bound of the range
	lowerOpen?: boolean,
	upperOpen?: boolean,
	count?    : number,  // Max documents count to select
	fromTop?  : boolean, // Select from the top of the range
}

type InDBRemoveOldDataOptions = {
	storeName   : string,
	keyPath     : string,
	index       : string, // Index to determine the records age
	countToLeave: number,
}

class InDbService {
	private db: IDBDatabase | undefined

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
	public openDB(scheme: InDBScheme, callback: InDBCallback): void {
		if (typeof window.indexedDB !== 'object') {
			callback('Indexed DB is not supported!', null)
			return
		}

		const request: IDBOpenDBRequest = window.indexedDB.open(scheme.name, scheme.version || 1)

		request.onsuccess = (event: Event): void => {
			this.db = (event.target as IDBRequest).result as IDBDatabase

			callback(null, this.db.name)
		}

		request.onerror = (event: Event): void => {
			callback((event.target as IDBRequest).error?.message || 'Something went wrong!', null)
		}

		request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
			this.db = (event.target as IDBRequest).result as IDBDatabase

			InDbService.upgradeDatabase(this.db, scheme)
		}
	}

	/**
	 * Closes the DB
	 *
	 * @return {void}
	 */
	public closeDB(): void {
		if (this.db) {
			this.db.close()
		}
	}

	/**
	 * Gets the estimate storage usage
	 *
	 * @param {function(usage: object)} callback
	 *
	 * @return {void}
	 */
	public estimateUsage(callback: (estimate: StorageEstimate) => void): void {
		navigator.storage.estimate().then(callback)
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
	public addData(storeName: string, data: object, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'add',
		}

		this.dbRequest(options, callback)
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
	public putData(storeName: string, data: object, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'put',
		}

		this.dbRequest(options, callback)
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
	public getData(storeName: string, key: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data     : undefined,
			keyPath  : key,
			mode     : 'readonly',
			actionTag: 'get',
		}

		this.dbRequest(options, callback)
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
	public deleteData(storeName: string, key: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data     : undefined,
			keyPath  : key,
			mode     : 'readwrite',
			actionTag: 'delete',
		}

		this.dbRequest(options, callback)
	}

	/**
	 * Removes all documents from a store.
	 *
	 * @param {string} storeName
	 * @param {function(err: string|null): void} callback
	 *
	 * @return {void}
	 */
	public clearStore(storeName: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data     : undefined,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'clear',
		}

		this.dbRequest(options, callback)
	}

	/**
	 * Gets the count of documents ina store.
	 *
	 * @param {string} storeName
	 * @param {function(err: string|null, count: number|null): void} callback
	 *
	 * @return {void}
	 */
	public countData(storeName: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data     : undefined,
			keyPath  : '',
			mode     : 'readonly',
			actionTag: 'count',
		}

		this.dbRequest(options, callback)
	}

	public getKeys(storeName: string, keysRange: InDBKeysRange, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName,
			data     : keysRange,
			keyPath  : '',
			mode     : 'readonly',
			actionTag: 'getKeys',
		}

		this.dbRequest(options, callback)
	}

	/**
	 * Prunes DB by removing the oldest data.
	 * It leaves the required newest count of data.
	 */
	public removeOldData(options: InDBRemoveOldDataOptions, callback: InDBCallback): void {
		const self: InDbService = this

		// Count all data
		this.countData(options.storeName,
			count_ready)

		function count_ready(err: string | null, count: number) {
			if (err) {
				callback(err, 0)
				return
			}

			// Check if there are objects to remove
			if (count <= options.countToLeave) {
				callback(null, 0)
				return
			}

			const keysRange: InDBKeysRange = {
				index: options.index,
				count: count - options.countToLeave
			}

			// Get the IDs of the data to be removed
			self.getKeys(options.storeName, keysRange,
				getKeys_ready)
		}

		function getKeys_ready(err: string | null, data: object[]) {
			if (err) {
				callback(err, 0)
				return
			}

			loop(data.map((e: object) => e[options.keyPath]))
		}

		function loop(ids: string[], countRemoved: number = 0) {
			if (ids.length === 0) {
				callback(null, countRemoved)
				return
			}

			// Deletes an document from `storeName` with a specified ID
			self.deleteData(options.storeName, ids[0],
				deleteData_ready)

			function deleteData_ready(err: string | null) {
				if (err) {
					callback(err, countRemoved)
					return
				}

				loop(ids.slice(1), countRemoved + 1)
			}
		}
	}

	private dbRequest(options: InDBRequestOptions, callback: InDBCallback): void {
		if (!this.db) {
			callback('Indexed DB is not open!', null)
			return
		}

		if (!this.db.objectStoreNames.contains(options.storeName)) {
			callback('Cannot find store named: ' + options.storeName, null)
			return
		}

		const transaction: IDBTransaction = this.db.transaction(options.storeName, options.mode)
		const store: IDBObjectStore       = transaction.objectStore(options.storeName)

		let request: IDBRequest
		switch (options.actionTag) {
			case 'add':
				request = store.add(options.data)
				break
			case 'clear':
				request = store.clear()
				break
			case 'count':
				request = store.count()
				break
			case 'delete':
				request = store.delete(options.keyPath)
				break
			case 'get':
				request = store.get(options.keyPath)
				break
			case 'put':
				request = store.put(options.data)
				break
			case 'getKeys':
				InDbService.dbCursor(store, options.data, callback)
				return
			default:
				callback('Unknown operation', null)
				return
		}

		request.onsuccess = (event: Event): void => {
			callback(null, (event.target as IDBRequest).result)
		}

		request.onerror = (event: Event): void => {
			callback((event.target as IDBRequest).error?.message || 'Something went wrong!', null)
		}
	}

	private static dbCursor(store: IDBObjectStore, range: InDBKeysRange, callback: InDBCallback): void {
		if (!store.indexNames.contains(range.index)) {
			callback(`Index '${range.index}' doesn't exist. It must be set in the DB scheme.`, null)
			return
		}

		const query: IDBKeyRange | undefined = typeof range.only !== 'undefined'
			? IDBKeyRange.only(range.only)
			: typeof range.lower === 'undefined'
				? undefined
				: typeof range.upper === 'undefined'
					? IDBKeyRange.lowerBound(range.lower, range.lowerOpen)
					: IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen)

		const index: IDBIndex     = store.index(range.index)
		const request: IDBRequest = index.openKeyCursor(query)
		const keys: object[]         = []
		const maxLength: number   = range.count || 1000000

		request.onsuccess = (event: Event): void => {
			const cursor: IDBCursor = (event.target as IDBRequest).result

			if (!cursor || (!range.fromTop && keys.length >= maxLength)) {
				const data: object[] = range.fromTop
					? keys.slice(Math.max(keys.length - maxLength, 0))
					: keys

				callback(null, data)
				return
			}

			const cursorData: object = {}
			cursorData[store.keyPath as string] = cursor.primaryKey
			if (range.index !== store.keyPath) {
				cursorData[range.index] = cursor.key
			}

			keys.push(cursorData)
			cursor.continue()
		}

		request.onerror = (event: Event): void => {
			callback((event.target as IDBRequest)?.error?.message || 'Something went wrong!', null)
		}
	}

	private static upgradeDatabase(db: IDBDatabase, scheme: InDBScheme): void {
		// Remove the unnecessary existing object stores
		if (db.objectStoreNames.length > 0) {
			const schemeStoresNames: string[]  = scheme.objectStores.map((store: InDBObjectStore) => store.name)
			const storeNamesToRemove: string[] = Array.from(db.objectStoreNames)
				.filter((storeName: string) => schemeStoresNames.indexOf(storeName) === -1)

			for (const name of storeNamesToRemove) {
				db.deleteObjectStore(name)
			}
		}

		// Add new stores
		for (const newStore of scheme.objectStores) {
			if (db.objectStoreNames.contains(newStore.name)) {
				continue
			}

			const storeParameters: IDBObjectStoreParameters = {
				keyPath      : newStore.keyPath,
				autoIncrement: !!newStore.autoIncrement,
			}

			// Create a mew object store
			const objectStore: IDBObjectStore = db.createObjectStore(newStore.name, storeParameters)

			// Create the necessary indexes
			if (newStore.indexes) {
				for (const index of newStore.indexes) {
					objectStore.createIndex(index.name, index.name, {unique: !!index.unique})
				}
			}
		}
	}
}
