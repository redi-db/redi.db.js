const Collection = require('./src/lib/Collection');
const axios = require('axios');
const Document = require('./src/lib/Document');

class redidb {
	constructor(argv) {
		this.link = `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${
			argv.port ? ':' + argv.port : ''
		}`;

		this.authorization = {
			login: argv.login,
			password: argv.password,
		};
	}

	async req(path, type = 'POST', body = {}, collection = null, custom = null) {
		return axios({
			method: type,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			url: `${!custom ? this.link : custom}${path}`,
			data: JSON.stringify(Object.assign(this.authorization, body)),
		}).then(response => {
			if (typeof response.data.success == 'boolean' && !response.data.success)
				throw new Error(response.data.message);

			return response.data.map(obj => new Document(obj, collection));
		});
	}

	create(database, collection) {
		return new Collection(Object.assign(this, { database, collection }));
	}
}

module.exports = redidb;
