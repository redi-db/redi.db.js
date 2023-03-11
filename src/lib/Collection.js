const Document = require('./Document');

class Collection {
	constructor(redi) {
		if (!redi) throw new Error('Database not found');
		this.redi = redi;
		this.link = `${this.redi.link}/${this.redi.database}/${this.redi.collection}`;
	}

	async create(...objects) {
		let response = await this.redi.req(
			`/create`,
			'POST',
			{ data: objects },
			this,
			this.link
		);

		if (response.length == 1) {
			if (!response[0].created) throw new Error(response[0].reason);
			return new Document(
				Object.assign({ _id: response[0]._id }, objects[0]),
				this
			);
		}
		return response;
	}

	async find(filter = {}) {
		return await this.redi.req(`/search`, 'POST', { filter }, this, this.link);
	}

	async findOne(filter = {}) {
		filter['$max'] = 1;

		var res = await this.redi.req(`/search`, 'POST', { filter }, this, this.link);
		if (res.length == 0) return null;
		return res[0];
	}

	async update(filter = {}, update = {}) {
		return await this.redi.req(
			'',
			'PUT',
			{ data: { filter, update } },
			this,
			this.link
		);
	}

	async findOrCreate(filter = {}, create = {}) {
		return await this.redi.req(
			`/searchOrCreate`,
			'POST',
			{ filter, data: create },
			this,
			this.link
		);
	}

	async delete(filter = {}) {
		return await this.redi.req('', 'DELETE', { filter }, this, this.link);
	}

	async count() {
		let response = await this.redi.req(
			`/list?login=${this.redi.authorization.login}&password=${this.redi.authorization.password}`,
			'GET',
			{},
			this,
			this.redi.link
		);

		if (!response.find(database => database.name == this.redi.database)) return 0;
		if (
			!response.find(database => database.name == this.redi.database)
				.collections ||
			!response
				.find(database => database.name == this.redi.database)
				.collections.find(collection => collection.name == this.redi.collection)
		)
			return 0;
		return response
			.find(database => database.name == this.redi.database)
			.collections.find(collection => collection.name == this.redi.collection)
			.count;
	}
}

module.exports = Collection;
