const Document = require('./Document');
const clients = require('./clients');
const axios = require('axios');

function throwError(response) {
	if (typeof response.success == 'boolean' && !response.success) throw new Error(response.message);
}

function getFilters(filter = {}) {
	if (filter['$gt'] && !Array.isArray(filter['$gt']) && typeof filter['$gt'] == 'object') filter['$gt'] = [filter['$gt']];
	if (filter['$lt'] && !Array.isArray(filter['$lt']) && typeof filter['$lt'] == 'object') filter['$lt'] = [filter['$lt']];
	if (filter['$ne'] && !Array.isArray(filter['$ne']) && typeof filter['$ne'] == 'object') filter['$ne'] = [filter['$ne']];
	if (filter['$and'] && !Array.isArray(filter['$and']) && typeof filter['$and'] == 'object') filter['$and'] = [filter['$and']];
	if (filter['$regex'] && !Array.isArray(filter['$regex']) && typeof filter['$regex'] == 'object') filter['$regex'] = [filter['$regex']];
	if (filter['$regex']) filter['$regex'] = filter['$regex'].map(regex => (typeof regex.value == 'object' ? { ...regex, value: regex.value.toString() } : regex));

	return filter;
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
			clients.get(this.redi.clientID).on('message', byteData => {
				try {
					const data = JSON.parse(byteData);
					const request = this.queue.get(data.requestID);

					if (data.error && request) request.reject(new Error(data.message));
					else if (request) request.resolve(data);

					if (this.queue.has(data.requestID)) this.queue.delete(data.requestID);
				} catch (error) {
					this.redi.emit('error', {
						inputData: byteData,
						error,
					});
				}
			});
		}
	}

	async create(...objects) {
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();

				this.queue.set(requestID, {
					updateID: requestID,
					resolve: ({ data }) => resolve(data),
					reject,
				});
				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'create', data: objects, requestID, ...this.data }));
			});

		const { data } = await axios.post(`${this.redi.link}/create`, {
			data: objects,
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		if (data.length == 1) {
			if (!data[0].created) throw new Error(data[0].reason);
			return new Document(
				Object.assign(
					{
						_id: data[0]._id,
					},
					objects[0]
				),
				this
			);
		}

		return data.data;
	}

	async search(filter = {}, _updateID = null) {
		filter = getFilters(filter);
		if (this.redi.method == 'WS')
			return new Promise(async (resolve, reject) => {
				const requestID = _updateID || Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) => resolve(data.map(document => new Document(document, this))),
					reject,
				});

				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'search', filter, requestID, ...this.data }));
			});

		const { data } = await axios.post(`${this.redi.link}/search`, {
			filter,
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		return data.map(document => new Document(document, this));
	}

	async searchOne(filter = {}) {
		filter = getFilters(filter);

		if (!filter['$lt'] || !filter['$gt']) filter['$max'] = 1;
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) => (!data.length ? resolve(null) : resolve(new Document(data[0], this))),
					reject,
				});

				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'search', filter, requestID, ...this.data }));
			});

		const { data } = await axios.post(`${this.redi.link}/search`, {
			filter,
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);

		if (data.length == 0) return null;
		return new Document(data[0], this);
	}

	async update(filter = {}, update = {}) {
		filter = getFilters(filter);
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) => resolve(data),
					reject,
				});

				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'update', data: [update], filter, requestID, ...this.data }));
			});

		const { data } = await axios.patch(this.redi.link, {
			data: {
				filter,
				update,
			},
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		return data;
	}

	async instantUpdate(filter = {}, update = {}) {
		filter = getFilters(filter);
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) => resolve(data),
					reject,
				});
				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'instantUpdate', data: [update], filter, requestID, ...this.data }));
			});

		const { data } = await axios.put(this.redi.link, {
			data: {
				filter,
				update,
			},
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		return data;
	}

	async searchOrCreate(filter = {}, create = {}) {
		filter = getFilters(filter);
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) =>
						resolve({
							created: data.created,
							data: new Document(data.data, this),
						}),
					reject,
				});

				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'searchOrCreate', data: [create], filter, requestID, ...this.data }));
			});

		const { data } = await axios.post(`${this.redi.link}/searchOrCreate`, {
			filter,
			data: create,
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		return {
			created: data.created,
			data: new Document(data.data, this),
		};
	}

	async delete(filter = {}) {
		filter = getFilters(filter);
		if (this.redi.method == 'WS')
			return new Promise((resolve, reject) => {
				const requestID = Date.now();
				this.queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) => resolve(data),
					reject,
				});

				clients.get(this.redi.clientID).send(JSON.stringify({ method: 'delete', filter, requestID, ...this.data }));
			});

		const { data } = await axios.delete(this.redi.link, {
			filter,
			...this.redi.authorization,
			...this.data,
		});

		throwError(data);
		return data;
	}

	async count(filter = {}) {
		filter = getFilters(filter);
		if (!Object.keys(filter).length) {
			try {
				const list = await (
					await axios.get(
						`${this.redi.listLink}/list?${Object.keys(this.redi.authorization)
							.map(key => `${key}=${this.redi.authorization[key]}`)
							.join('&')}`
					)
				).data;
				return list.find(db => db.name == this.data.database).collections.find(collection => collection.name == this.data.collection).count;
			} catch {
				return 0;
			}
		} else return (await this.search(Object.assign(filter, { $only: [''] }))).length;
	}
};
