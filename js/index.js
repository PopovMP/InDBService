'use strict'

const inDbService = new InDbService()

const scheme = {
	name        : 'dbName',      // DB name. Usually your domain or project name.
	objectStores: [{
		name    : 'storeName',   // Object store name (aka Table name)
		keyPath : 'dataId',      // Primary key for identifying the objects
		indexes : [
			{name: 'dataId'   }, // Needed for `getAllPrimaryKeys` example
			{name: 'updatedAt'}, // Needed for `removeOldData` and `getRecentDataKeys` examples
		],
	}],
}

let output

function runTests() {
	output = document.getElementById('output')

	openDB()
}

function openDB() {
	// Open an existing DB, create a new one or update the current DB according to the scheme.
	inDbService.openDB(scheme,
		openDB_ready)
}

/**
 * @param {string|null} err
 * @param {string|null} dbName
 */
function openDB_ready(err, dbName) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`DB opened: ${dbName}`)

	addData()
}

function addData() {
	const doc = {
		dataId   : 'foo' + Math.random(),
		updatedAt: Date.now(),
		val      : 'bar',
	}

	inDbService.addData('storeName', doc,
		addData_ready)
}

/**
 * @param {string|null} err
 * @param {string|null} keyPath
 */
function addData_ready(err, keyPath) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`Doc added: ${keyPath}`)

	countData()
}

function countData() {
	inDbService.countData('storeName',
		countData_ready)
}

/**
 * @param {string|null} err
 * @param {number|null} count
 */
function countData_ready(err, count) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`\nCount of data: ${count}`)

	removeOldData()
}

function removeOldData() {
	const removeOptions = {
		storeName   : 'storeName',
		keyPath     : 'dataId',
		index       : 'updatedAt',
		countToLeave: 10,
	}

	appendText('\nRemove old data:')
	inDbService.removeOldData(removeOptions,
		removeOldData_ready)

}

/**
 * @param {string|null} err
 * @param {number|null} countRemoved
 */
function removeOldData_ready(err, countRemoved) {
	if (err) {
		appendText(`Error: ${err}`)
		return
	}

	appendText(`Count removed: ${countRemoved}`)

	getRecentDataKeys()
}

function getRecentDataKeys() {
	appendText('\nRecent data keys:')

	// Gets the newest 10 documents.
	const query = {
		index  : 'updatedAt',
		count  : 10,
		fromTop: true,
	}

	inDbService.getKeys('storeName', query,
		getRecentDataKeys_ready)
}

function getRecentDataKeys_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	const output = data
		.map(doc => `Updated at: ${new Date(doc.updatedAt).toLocaleString()}, dataId: ${doc.dataId}`)
		.join('\n')

	appendText(output)

	getData(data[data.length - 1].dataId)
}

function getData(dataId) {
	appendText('\nGet data:')

	inDbService.getData('storeName', dataId,
		getData_ready)
}

function getData_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`Updated at: ${new Date(data.updatedAt).toLocaleString()}, dataId: ${data.dataId}`)

	getAllPrimaryKeys()
}

function getAllPrimaryKeys() {
	appendText('\nAll primary keys:')

	inDbService.getKeys('storeName', {index: 'dataId'},
		getKeys_ready)
}

function getKeys_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	const output = data.map(doc => `dataId: ${doc.dataId}`).join('\n')
	appendText(output)

	estimateUsage()
}

function estimateUsage() {
	appendText('\nEstimated usage:')

	inDbService.estimateUsage(
		estimateUsage_ready)
}

function estimateUsage_ready(estimate) {
	appendText(JSON.stringify(estimate, null, 2))

	closeDB()
}

function closeDB() {
	inDbService.closeDB()
}

function appendText(text) {
	output.innerText += '\n' + text
}
