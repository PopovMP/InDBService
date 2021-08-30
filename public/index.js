'use strict'

let output
let inDbService

const dbScheme = {
	name        : 'dbName',
	version     : 1,
	objectStores: [{
		name         : 'storeName',
		keyPath      : 'dataId',
		autoIncrement: false,
		indexes      : [{
			name  : 'dataId',
			unique: true,
		}, {
			name  : 'updatedAt',
			unique: false,
		}],
	}],
}

function runTests() {
	output = document.getElementById('output')

	inDbService = new InDbService()
	inDbService.openDB(dbScheme,
		inDbHelper_openDB_ready)
}

function inDbHelper_openDB_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`DB opened: ${JSON.stringify(data)}`)

	const doc = {
		dataId   : 'foo' + Math.random(),
		updatedAt: Date.now(),
		val      : 'bar',
	}

	inDbService.addData('storeName', doc,
		inDbHelper_addData_ready)
}

function inDbHelper_addData_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`Doc added: ${data}`)

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

function removeOldData_ready(err, countRemoved) {
	if (err) {
		appendText(`Error: ${err}`)
		return
	}

	appendText(`Count removed: ${countRemoved}`)

	getRecentDataKeys()
}

function getRecentDataKeys() {
	const query = {
		index  : 'updatedAt',
		count  : 10,
		fromTop: true,
	}

	appendText('\nRecent data keys:')
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
		getDocument_ready)
}

function getDocument_ready(err, data) {
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
		getAllPrimaryKeys_ready)
}

function getAllPrimaryKeys_ready(err, data) {
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
	inDbService.estimateUsage(estimateUsage_ready)
}

function estimateUsage_ready(estimate) {
	appendText(JSON.stringify(estimate, null, 2))
}

function appendText(text) {
	output.innerText += '\n' + text
}
