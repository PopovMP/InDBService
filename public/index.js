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
			unique: true,
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

	removeOldData(10)
}

function removeOldData(countToLeave) {
	let countRemoved = 0
	inDbService.countData('storeName',
		count_ready)

	function count_ready(err, count) {
		if (err) {
			removeOldData_ready(err, countRemoved)
			return
		}

		appendText(`Count: ${count}`)

		// Get all IDs except the newest 10
		inDbService.getKeys('storeName', {index: 'updatedAt', count: count - countToLeave},
			getKeys_ready)
	}

	function getKeys_ready(err, data) {
		if (err) {
			removeOldData_ready(err, countRemoved)
			return
		}

		loop(data.map(e => e.dataId))

		function loop(ids) {
			if (ids.length === 0) {
				removeOldData_ready(null, countRemoved)
				return
			}

			const id = ids[0]

			inDbService.deleteData('storeName', id,
				remove_ready)

			function remove_ready(err) {
				if (err) {
					removeOldData_ready(err, countRemoved)
					return
				}

				appendText(`Doc removed: ${id}`)
				countRemoved += 1

				loop(ids.slice(1))
			}
		}
	}
}

function removeOldData_ready(err, countRemoved) {
	if (err) {
		appendText(`Error: ${err}`)
		return
	}

	appendText(`Count removed: ${countRemoved}`)

	getKeys()
}

function getKeys() {
	const query = {
		index: 'updatedAt',
		count: 10,
		fromTop: true,
	}

	inDbService.getKeys('storeName', query,
		inDbHelper_getKeys_ready)
}

function inDbHelper_getKeys_ready(err, data) {
	if (err) {
		appendText(err)
		return
	}

	for (const doc of data) {
		appendText(`time: ${new Date(doc.updatedAt).toLocaleString()}, dataId: ${doc.dataId}`)
	}

	inDbService.estimateUsage(estimateUsage_ready)
}

function estimateUsage_ready(estimate) {
	appendText(JSON.stringify(estimate, null, 2))
}

function appendText(text) {
	output.innerText += '\n' + text
}
