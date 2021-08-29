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

	public getAllKeys(storeName: string, callback: InDBCallback): void {
		const options: InDBRequestOptions = {
			storeName: storeName,
			data     : undefined,
			keyPath  : '',
			mode     : 'readonly',
			actionTag: 'getAllKeys',
		}

		this.dbRequest(options, callback)
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
			case 'getAllKeys':
				request = objectStore.getAllKeys()
				break
			case 'put':
				request = objectStore.put(options.data)
				break
			default:
				callback('Unknown operation', null)
				return
		}

		request.onerror = function (event: Event): void {
			// @ts-ignore
			callback(event?.target?.error?.message, null)
		}

		request.onsuccess = function (event: Event): void {
			// @ts-ignore
			callback(null, event?.target?.result)
		}
	}

	private openDBRequest_upgradeNeeded(dbScheme: InDBScheme, event: Event | null): void {
		// @ts-ignore
		this.db = event?.target?.result as IDBDatabase

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
		this.db = event?.target?.result as IDBDatabase

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
