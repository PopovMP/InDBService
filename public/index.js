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
		indexes      : [{name: 'dataId', unique: true}],
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

	appendText(`DB opened: ${ JSON.stringify(data) }`)

	inDbService.addData('storeName', {dataId: 'foo' + Math.random(), val: 'bar'},
		inDbHelper_addData_ready)
}

function inDbHelper_addData_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	appendText(`Doc added: ${ data }`)

	getAllKeys()
}

function getAllKeys() {
	inDbService.getAllKeys('storeName',
		inDbHelper_ready)
}

function inDbHelper_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	appendText(JSON.stringify(data, null, 2))

	inDbService.estimateUsage(estimateUsage_ready)
}

function estimateUsage_ready(estimate) {
	appendText(JSON.stringify(estimate, null, 2))
}

function appendText(text) {
	output.innerText += '\n' + text
}
