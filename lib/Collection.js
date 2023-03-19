const Document = require('./Document');
const fetch = require('node-fetch');

function throwError(response) {
	if (typeof response.success == 'boolean' && !response.success)
		throw new Error(response.message);
}

module.exports = class Collection {
	constructor(redi, {
		database,
		collection
	}) {
		if (!redi) throw new Error('Database not found');
		this.redi = redi;
		this.data = {
			database,
			collection
		}
	}

	async create(...objects) {
		let response = await fetch(`${this.redi.link}/create`, {
			method: 'POST',
			body: JSON.stringify({
				data: objects,
				...this.redi.authorization,
				...this.data
			})
		});

		response = await response.json();
		throwError(response);
		if (response.length == 1) {
			if (!response[0].created) throw new Error(response[0].reason);
			return new Document(
				Object.assign({
					_id: response[0]._id
				}, objects[0]),
				this
			);
		}

		return response.data;
	}

	async search(filter = {}) {
		let response = await fetch(`${this.redi.link}/search`, {
			method: "POST",
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data
			})
		});

		response = await response.json();
		throwError(response);

		return response.map(document => new Document(document, this));
	}

	async searchOne(filter = {}) {
		filter['$max'] = 1;

		var response = await fetch(`${this.redi.link}/search`, {
			method: 'POST',
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data
			})
		});

		response = await response.json();
		throwError(response);

		if (response.length == 0) return null;
		return new Document(response[0], this);
	}

	async update(filter = {}, update = {}) {
		let response = await fetch(this.redi.link, {
			method: "PUT",
			body: JSON.stringify({
				data: {
					filter,
					update
				},
				...this.redi.authorization,
				...this.data
			})
		})

		response = await response.json();
		throwError(response);
		return response;
	}

	async searchOrCreate(filter = {}, create = {}) {
		let response = await fetch(`${this.redi.link}/searchOrCreate`, {
			method: "POST",
			body: JSON.stringify({
				filter,
				data: create,
				...this.redi.authorization,
				...this.data
			})
		});

		response = await response.json();
		throwError(response);

		return {
			created: response.created,
			data: new Document(response.data, this),
		};
	}

	async delete(filter = {}) {
		let response = await fetch(this.redi.link, {
			method: "DELETE",
			body: JSON.stringify({
				filter,
				...this.redi.authorization,
				...this.data
			}),
		});

		response = await response.json();
		throwError(response);

		return response;
	}

	async count(filter = {}) {
		return (await this.search(filter)).length;
	}
};