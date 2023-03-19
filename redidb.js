const Collection = require('./lib/Collection');

module.exports = class redidb {
	constructor(argv) {
		this.link = `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${
			argv.port ? ':' + argv.port : ''
		}`;

		this.authorization = {
			login: argv.login,
			password: argv.password,
		};
	}

	create(database, collection) {
		return new Collection(this, {
			database,
			collection
		});
	}
};