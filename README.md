## InDBService

**InDBService** provides a convenient API for the browser's IndexedDB.

**Goals**:
- **simple** - sane API with sane defaults.
- **fast** - InDBService has a simple API with only the most needed instructions.
- **clean** - no dependencies, no promises (of any kind)...

## Integration

**InDBService** comes in both TypeScript and JavaScript versions. You can include the necessary file in your project.

## Quick example


### Open or create a DB
Open a DB by providing a scheme. **InDBService**  will create a new DB if it doesn't exist. 

```js
// Database scheme
const scheme = {
    name : 'bookstore', // DB name. Usually your domain or project name.
    objectStores: [{
        name   : 'books', // Object store name (aka Table name)
        keyPath: 'isbn', // Primary key for identifying the objects
    }],
}

// Open (or create a DB)
const inDbService = new InDbService()
inDbService.openDB(scheme, (err, dbDetails) => {})
```

### Add a document

`addData` - adds a document to an open DB.

**Note that the new document must have a unique keyPath.** 

If you want to update an existing document use the `putData` method.

```js
// Add a document
const book = {
    isbn  : '0330508113', // This field is mandatory because it is a `keyPath` of the `dataStore`.
    title : 'The Ultimate Hitchhiker\'s Guide',
    author: 'Douglas Adams',
    year  : '2009',
}

inDbService.addData('books', book, (err, keyPath) => {})
```

### Add or update a document

`putData` - adds a new document or updates an existing one.

```js
inDbService.putData('books', book, (err, keyPath) => {})
```

### Get a document by key

`getData` gets a document from DB by key

```js
// Get a document
inDbService.getData('books', '0330508113', (err, document) => {
	if (err) {
		console.log(err)
		return
	}

	console.log( JSON.stringify(document, null, 2) )
})
```

### Removes a document by key

`deleteData` removes a document from DB by key

```js
// Delete a document
inDbService.deleteData('books', '0330508113', (err, data) => {})
```

### Count of documents

`countData` gives the count of the dataStore entries.

```js
// Count all documents
inDbService.countData('books', (err, count) => {
    if (err) {
        console.log(err)
        return
    }

    console.log(`Count: ${count}`)
})
```

### Get all keys

In order to get all keys from a datastore the corresponding key must be a datastore index.

You define the datastore indexes in the scheme as follows:

```js
// Database scheme
const scheme = {
    name : 'bookstore',
    objectStores: [{
        name   : 'books',
        keyPath: 'isbn',
        indexes: [
            {name: 'isbn'     }, // Needed for `getAllKeys` example
            {name: 'updatedAt'}, // Needed for `removeOldData` and `getRecentDataKeys` examples
        ],
    }],
}

// Open (or create a DB)
const inDbService = new InDbService()
inDbService.openDB(scheme, (err, dbDetails) => {})

// Get all keys from an index
inDbService.getKeys('books', {index: 'isbn'}, (err, data) => {})
```

### Get the newest datastore entries

We can get keys form an index in a particular range.

For al possibilities see the `InDBKeysRange` type.

```js
    // Add a book with an `updatedAt` filed

// Add a document
const book = {
    isbn     : '0330508113',
    // ... 
    updatedAt: Date.now(),
}

inDbService.addData('books', book, (err, data) => {})

// Gets the newest 10 entries.
const query = {
    index  : 'updatedAt',
    count  : 10,
    fromTop: true,
}

inDbService.getKeys('books', query, (err, data) => {})
```

### Remove the oldest entries

**InDBService** provides a method of removing all old records except the newest `n` records.

```js
const removeOptions = {
    storeName   : 'books',
    keyPath     : 'isbn',
    index       : 'updatedAt',
    countToLeave: 10,
}

inDbService.removeOldData(removeOptions, (err, data) => {})
```
