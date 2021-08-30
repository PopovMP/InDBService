type InDBCallback = (err: string | null, data?: any | null) => void

type InDBIndex = {
	name  : string,
	unique: boolean,
}

type InDBObjectStore = {
	name         : string,
	keyPath      : string,
	autoIncrement: boolean,
	indexes      : InDBIndex[],
}

type InDBScheme = {
	name        : string,
	version     : number,
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
	index       : string,
	countToLeave: number,
}

class InDbService {
	private db: IDBDatabase | undefined

	constructor() {
	}

	public openDB(dbScheme: InDBScheme, callback: InDBCallback): void {
		if (typeof window.indexedDB !== 'object') {
			callback('Indexed DB is not supported!', null)
			return
		}

		const request: IDBOpenDBRequest = window.indexedDB.open(dbScheme.name, dbScheme.version)
		request.onupgradeneeded = this.openDBRequest_upgradeNeeded.bind(this, dbScheme)
		request.onsuccess       = this.openDBRequest_success.bind(this, callback)
		request.onerror         = this.openDBRequest_error.bind(this, callback)
	}

	public estimateUsage(callback: (estimate: StorageEstimate) => void): void {
		navigator.storage.estimate().then(callback)
	}

	public addData(storeName: string, data: any, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : data,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'add',
		}

		this.dbRequest(options, callback)
	}

	public putData(storeName: string, data: any, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : data,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'put',
		}

		this.dbRequest(options, callback)
	}

	public getData(storeName: string, key: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : undefined,
			keyPath  : key,
			mode     : 'readonly',
			actionTag: 'get',
		}

		this.dbRequest(options, callback)
	}

	public deleteData(storeName: string, key: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : undefined,
			keyPath  : key,
			mode     : 'readwrite',
			actionTag: 'delete',
		}

		this.dbRequest(options, callback)
	}

	public clearStore(storeName: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : undefined,
			keyPath  : '',
			mode     : 'readwrite',
			actionTag: 'clear',
		}

		this.dbRequest(options, callback)
	}

	public countData(storeName: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : undefined,
			keyPath  : '',
			mode     : 'readonly',
			actionTag: 'count',
		}

		this.dbRequest(options, callback)
	}

	public getKeys(storeName: string, keysRange: InDBKeysRange, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
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

		function getKeys_ready(err: string | null, data: any[]) {
			if (err) {
				callback(err, 0)
				return
			}

			loop(data.map((e: any) => e[options.keyPath]))
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
		transaction.onerror = function (event: Event): void {
			// @ts-ignore
			callback(event.target.error.message, null)
		}

		const objectStore: IDBObjectStore = transaction.objectStore(options.storeName)

		let request: IDBRequest
		switch (options.actionTag) {
			case 'add':
				request = objectStore.add(options.data)
				break
			case 'clear':
				request = objectStore.clear()
				break
			case 'count':
				request = objectStore.count()
				break
			case 'delete':
				request = objectStore.delete(options.keyPath)
				break
			case 'get':
				request = objectStore.get(options.keyPath)
				break
			case 'getKeys':
				this.dbCursor(objectStore, options.data, callback)
				return
			case 'put':
				request = objectStore.put(options.data)
				break
			default:
				callback('Unknown operation', null)
				return
		}

		// @ts-ignore
		request.onerror = (event: Event): void => callback(event.target.error.message, null)

		// @ts-ignore
		request.onsuccess = (event: Event): void => callback(null, event.target.result)
	}

	private dbCursor(objectStore: IDBObjectStore, range: InDBKeysRange, callback: InDBCallback): void {
		const query: IDBKeyRange | undefined = typeof range.only !== 'undefined'
			? IDBKeyRange.only(range.only)
			: typeof range.lower === 'undefined'
				? undefined
				: typeof range.upper === 'undefined'
					? IDBKeyRange.lowerBound(range.lower, range.lowerOpen)
					: IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen)

		const index: IDBIndex     = objectStore.index(range.index)
		const request: IDBRequest = index.openKeyCursor(query)
		const keys: any[]         = []
		const maxLength: number   = range.count || 1000000

		request.onsuccess = (event: Event): void => {
			// @ts-ignore
			const cursor: IDBCursor = event.target.result

			if (!cursor || (!range.fromTop && keys.length >= maxLength)) {
				const data: any[] = range.fromTop
					? keys.slice(Math.max(keys.length - maxLength, 0))
					: keys
				callback(null, data)
				return
			}

			const cursorData: any = {}
			cursorData[objectStore.keyPath as string] = cursor.primaryKey
			if (range.index !== objectStore.keyPath) {
				cursorData[range.index] = cursor.key
			}

			keys.push(cursorData)

			cursor.continue()
		}

		// @ts-ignore
		request.onerror = (event: Event): void => callback(event.target.error.message, null)
	}

	private openDBRequest_upgradeNeeded(dbScheme: InDBScheme, event: Event | null): void {
		// @ts-ignore
		this.db = event.target.result as IDBDatabase

		// Contains the store names required by the scheme
		const schemeStoresNames: string[] = []
		for (const newStore of dbScheme.objectStores) {
			schemeStoresNames.push(newStore.name)

			if (this.db.objectStoreNames.contains(newStore.name)) {
				continue
			}

			const storeParameters: IDBObjectStoreParameters = {
				keyPath      : newStore.keyPath,
				autoIncrement: newStore.autoIncrement,
			}

			// Create a mew object store
			const objectStore: IDBObjectStore = this.db.createObjectStore(newStore.name, storeParameters)

			// Add the necessary indexes
			for (const index of newStore.indexes) {
				objectStore.createIndex(index.name, index.name, {unique: index.unique})
			}
		}

		// Collect the existing store names that are not in the new scheme.
		const storesToRemove: string[] = []
		for (let i = 0; i < this.db.objectStoreNames.length; i++) {
			const storeName: string = this.db.objectStoreNames[i]
			if (schemeStoresNames.indexOf(storeName) === -1) {
				storesToRemove.push(storeName)
			}
		}

		// Removes the unnecessary object stores.
		for (const name of storesToRemove) {
			this.db.deleteObjectStore(name)
		}
	}

	private openDBRequest_success(callback: InDBCallback, event: Event | null): void {
		// @ts-ignore
		this.db = event.target.result as IDBDatabase

		const storeNames: string[] = []
		for (let i = 0; i < this.db.objectStoreNames.length; i++) {
			storeNames.push(this.db.objectStoreNames[i])
		}

		callback(null, {name: this.db.name, version: this.db.version, storeNames: storeNames})
	}

	private openDBRequest_error(callback: InDBCallback, event: Event): void {
		// @ts-ignore
		callback(event.target.error.message, null)
	}
}
