module.exports = class Clients {
	static _clients = [];

	static get(id = 0) {
		return this._clients.find(client => client.id == id)?.client;
	}

	static add(client) {
		if (!client) throw new Error('No client to add');

		const copy = this._clients.find(data => data.client.url == client.url);
		if (copy) return copy.id;

		const id = this._clients.length + 1;
		this._clients.push({
			id,
			client,
		});

		return id;
	}
};
