class Document {
	constructor(data, collection) {
		if (!data) throw new Error('Invalid document data');
		Object.defineProperty(this, '$save', {
			value: () => $save(this, collection),
			writable: false,
		});

		Object.defineProperty(this, '$delete', {
			value: () => $delete(this, collection),
			writable: false,
		});

		Object.keys(data)
			.filter(key => !key.startsWith('$'))
			.forEach(documentData => (this[documentData] = data[documentData]));

		Object.defineProperty(this, '_id', {
			writable: false,
		});
	}
}

async function $save(document, collection) {
	let doc = { ...document };

	['_id', '$save', '$delete'].forEach(key => delete doc[key]);
	return (await collection.update({ _id: document._id }, doc))[0];
}

async function $delete(document, collection) {
	['$save', '$delete'].forEach(key => delete document[key]);

	return (await collection.delete({ _id: document._id }))[0];
}

module.exports = Document;
