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
	}

	async create(...objects) {
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						if (data.data.length == 1) {
							if (data.data[0].created)
								return resolve(
									new Document(
										Object.assign(
											{
												_id: data.data[0]._id,
											},
											objects[0]
										),
										this
									)
								);
							else return reject(data.data[0].reason);
						}

						resolve(data.data);
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'create', data: objects, ...this.data }));
			});
		}

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
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						resolve(data.data.map(document => new Document(document, this)));
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'search', filter, ...this.data }));
			});
		}

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
		filter['$max'] = 1;
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);
						if (!data.data.length) return resolve(null);

						resolve(new Document(data.data[0], this));
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'search', filter, ...this.data }));
			});
		}

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
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						resolve(data.data);
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'update', data: [update], filter, ...this.data }));
			});
		}

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
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						resolve(data.data);
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'instantUpdate', data: [update], filter, ...this.data }));
			});
		}

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
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						resolve({
							created: data.data.created,
							data: new Document(data.data.data, this),
						});
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'searchOrCreate', data: [create], filter, ...this.data }));
			});
		}

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
		if (this.redi.method == 'WS') {
			return new Promise((resolve, reject) => {
				this.redi.ws.once('message', byteData => {
					try {
						const data = JSON.parse(byteData);
						if (data.error) return reject(data.message);

						resolve(data.data);
					} catch (err) {
						reject(err.message);
						this.redi.emit('error', err.message);
					}
				});

				this.redi.ws.send(JSON.stringify({ method: 'delete', filter, ...this.data }));
			});
		}

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

	async count(filter) {
		filter['$only'] = [''];
		return (await this.search(filter)).length;
	}
};
