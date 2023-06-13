const Document = require('./Document');
const fetch = require('node-fetch');

function throwError(response) {
	if (typeof response.success == 'boolean' && !response.success) throw new Error(response.message);
}

module.exports = class Collection {
	constructor(redi, { database, collection }) {
		if (!redi) throw new Error('Database not found');

		this.redi = redi;
		this.data = {
			database,
			collection,
		};

		if (this.redi.method == 'WS') {
			this.queue = new Map();

			this.redi.ws.on('message', byteData => {
				try {
					const data = JSON.parse(byteData);
					const request = this.queue.get(data.requestID);

					if (data.error && request) request.reject(new Error(data.message));
					else if (request) request.resolve(data);

					this.queue.delete(data.requestID);
				} catch (error) {
					this.redi.emit('error', {
						inputData: byteData,
						error
					});
				}
			});
		}
	}

	async create(...objects) {
		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();

			this.queue.set(requestID, {
				resolve: ({ data }) => resolve(data),
				reject,
			});
			this.redi.ws.send(JSON.stringify({ method: 'create', data: objects, requestID, ...this.data }));
		});


		let response = await fetch(`${this.redi.link}/create`, {
			method: 'POST',
			body: JSON.stringify({
				data: objects,
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);
		if (response.length == 1) {
			if (!response[0].created) throw new Error(response[0].reason);
			return new Document(
				Object.assign(
					{
						_id: response[0]._id,
					},
					objects[0]
				),
				this
			);
		}

		return response.data;
	}

	async search(filter = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (this.redi.method == 'WS') return new Promise(async (resolve, reject) => {
			const requestID = Date.now();

			this.queue.set(requestID, {
				resolve: ({ data }) => resolve(data.map(document => new Document(document, this))),
				reject
			})

			this.redi.ws.send(JSON.stringify({ method: 'search', filter, requestID, ...this.data }));
		});


		let response = await fetch(`${this.redi.link}/search`, {
			method: 'POST',
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);

		return response.map(document => new Document(document, this));
	}

	async searchOne(filter = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		filter['$max'] = 1;
		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();
			this.queue.set(requestID, {
				resolve: ({ data }) => !data.length ? resolve(null) : resolve(new Document(data[0], this)),
				reject
			})

			this.redi.ws.send(JSON.stringify({ method: 'search', filter, requestID, ...this.data }));
		});


		var response = await fetch(`${this.redi.link}/search`, {
			method: 'POST',
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);

		if (response.length == 0) return null;
		return new Document(response[0], this);
	}

	async update(filter = {}, update = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();
			this.queue.set(requestID, {
				resolve: ({ data }) => resolve(data),
				reject
			})

			this.redi.ws.send(JSON.stringify({ method: 'update', data: [update], filter, requestID, ...this.data }));
		});


		let response = await fetch(this.redi.link, {
			method: 'PATCH',
			body: JSON.stringify({
				data: {
					filter,
					update,
				},
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);
		return response;
	}

	async instantUpdate(filter = {}, update = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();
			this.queue.set(requestID, {
				resolve: ({ data }) => resolve(data),
				reject
			})
			this.redi.ws.send(JSON.stringify({ method: 'instantUpdate', data: [update], filter, requestID, ...this.data }));
		});


		let response = await fetch(this.redi.link, {
			method: 'PUT',
			body: JSON.stringify({
				data: {
					filter,
					update,
				},
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);
		return response;
	}

	async searchOrCreate(filter = {}, create = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();
			this.queue.set(requestID, {
				resolve: ({ data }) => resolve({
					created: data.created,
					data: new Document(data.data, this),
				}),
				reject
			})


			this.redi.ws.send(JSON.stringify({ method: 'searchOrCreate', data: [create], filter, requestID, ...this.data }));
		});


		let response = await fetch(`${this.redi.link}/searchOrCreate`, {
			method: 'POST',
			body: JSON.stringify({
				filter,
				data: create,
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);

		return {
			created: response.created,
			data: new Document(response.data, this),
		};
	}

	async delete(filter = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (this.redi.method == 'WS') return new Promise((resolve, reject) => {
			const requestID = Date.now();
			this.queue.set(requestID, {
				resolve: ({ data }) => resolve(data),
				reject
			})

			this.redi.ws.send(JSON.stringify({ method: 'delete', filter, requestID, ...this.data }));
		});


		let response = await fetch(this.redi.link, {
			method: 'DELETE',
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data,
			}),
		});

		response = await response.json();
		throwError(response);

		return response;
	}

	async count(filter = {}) {
		if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof (filter['$gt']) == 'object') filter['$gt'] = [filter['$gt']]
		if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof (filter['$lt']) == 'object') filter['$lt'] = [filter['$lt']]
		if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof (filter['$ne']) == 'object') filter['$ne'] = [filter['$ne']]

		if (!Object.keys(filter).length) {
			try {
				const list = await (await fetch(`${this.redi.listLink}/list?${Object.keys(this.redi.authorization).map(key => `${key}=${this.redi.authorization[key]}`).join('&')}`)).json()
				return list.find(db => db.name == this.data.database).collections.find(collection => collection.name == this.data.collection).count
			} catch {
				return 0
			}
		} else return (await this.search(Object.assign(filter, { $only: [''] }))).length;
	}
};