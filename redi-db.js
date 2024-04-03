const { generateUpdateID } = require('./lib/generator');
const DatabaseDocument = require('./lib/Document');
const clients = require('./lib/clients');
const EventEmitter = require('events');
const WebSocket = require('ws');
const axios = require('axios');
const PWS = require('pws');

const CONNECTION_CHECK_INTERVAL = 1000;
const DISTRIBUTOR_ERROR = new Error('distributorID accept only string');

module.exports.RediClient = class DatabaseClient extends EventEmitter {
	constructor(argv) {
		super();

		this.link = argv.websocket ? `${argv.useSSL ? 'wss' : 'ws'}://${argv.ip}${argv.port ? ':' + argv.port : ''}/ws?login=${argv.login}&password=${argv.password}` : `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;
		this.listLink = `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;

		this.method = argv.websocket ? 'WS' : 'HTTP';
		this.authorization = {
			login: argv.login,
			password: argv.password,
		};

		if (this.method == 'WS') {
			this.setMaxListeners(Infinity);

			this.clientID = clients.add(new PWS(this.link, WebSocket));
			this.disconnect = clients.get(this.clientID).close;
			this.connect = clients.get(this.clientID).connect;
			this.connected = false;

			let _disconnected = false;
			clients.get(this.clientID).firstConnect = false;
			clients.get(this.clientID).on('open', () => {
				this.connected = true;
				_disconnected = false;

				if (clients.get(this.clientID).firstConnect) return void this.emit('reconnected');

				clients.get(this.clientID).firstConnect = true;
				this.emit('connected');
			});

			clients.get(this.clientID).on('close', () => {
				this.connected = false;
				if (clients.get(this.clientID).firstConnect && !_disconnected) {
					_disconnected = true;
					this.emit('disconnect');
				}
			});
		}
	}
};

/**
 * @typedef {Object} SaveResult
 * @property {string} _id - ID of the document.
 * @property {boolean} updated - Indicates if the request was successful.
 */

/**
 * @typedef {Object} DeleteResult
 * @property {string} _id - ID of the document.
 * @property {boolean} deleted - Indicates if the request was successful.
 * @property {string?} reason - Reason why doesn't deleted
 */

/**
 * @typedef {Object} SearchResultItem
 * @property {string} _id - ID of the document.
 * @property {(instant = false) => Promise<SaveResult>} $save - Promise for saving the document.
 * @property {() => Promise<DeleteResult>} $delete - Promise for deleting the document.
 */

function requestHasError(response) {
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

module.exports.Document = class Document {
	#validatorDisabled;
	#distributors;
	#client;
	#model;
	#queue;
	#data;

	constructor(client, database, collection, model, disableValidator = false) {
		if (!(client instanceof module.exports.RediClient)) throw new Error('Invalid client');
		if (!database || typeof database != 'string') throw new Error('Invalid database name');
		if (!collection || typeof collection != 'string') throw new Error('Invalid collection name');

		this.#client = client;
		this.#validatorDisabled = disableValidator;
		this.#model = { ...model, _id: String };
		this.#data = {
			database,
			collection,
		};

		if (this.#client.method == 'WS') {
			this.#queue = new Map();
			this.#distributors = new Map();

			clients.get(this.#client.clientID).on('message', async byteData => {
				try {
					const data = JSON.parse(byteData);
					const request = this.#queue.get(data.requestID);

					if (data.error && request) request.reject(new Error(data.message));
					else if (request) request.resolve(data);

					if (this.#queue.has(data.requestID)) this.#queue.delete(data.requestID);
				} catch (error) {
					this.#client.emit('error', {
						inputData: byteData,
						error,
					});
				}
			});
		}
	}

	#validateExtraProperties(data, model) {
		for (const key in data) {
			if (key.startsWith('$')) continue;

			if (!(key in model)) {
				throw new Error(`Extra property "${key}" found in the data`);
			}

			if (typeof model[key] === 'object' && !Array.isArray(model[key]) && model[key] !== null) {
				this.#validateExtraProperties(data[key], model[key]);
			}
		}
	}

	#validateModel(data, isFilter = false, model = undefined, _id = false) {
		if (this.#validatorDisabled) return;
		if (isFilter && !data) return;
		if ((!isFilter && !data) || (!isFilter && typeof data !== 'object')) throw new Error('Invalid data for model validation');

		const validationModel = model || this.#model;
		for (const key in validationModel) {
			if (_id && key == '_id') continue;

			const actualType = typeof data[key];
			const expectedType = typeof validationModel[key];
			const isObject = expectedType === 'object' && validationModel[key] !== null;

			if (isFilter && actualType == 'function' && key.startsWith('$')) continue;
			if (isObject && !Array.isArray(validationModel[key])) this.#validateModel(data[key], isFilter, validationModel[key]);
			else if (isObject && isFilter && Array.isArray(validationModel[key]) && actualType == 'undefined') continue;
			else if (isObject && Array.isArray(validationModel[key]) && !validationModel[key].map(type => (type == null ? 'null' : validationModel[key] == Array ? 'array' : typeof type())).includes(actualType == 'object' ? (Array.isArray(data[key]) ? 'array' : 'null') : actualType)) {
				console.log(
					key,
					validationModel[key].map(type => (type == null ? 'null' : validationModel[key] == Array ? 'array' : typeof type())),

					actualType == 'object' ? (Array.isArray(data[key]) ? 'array' : 'null') : actualType
				);
				throw new Error(`Invalid type for property "${key}". Expected ${validationModel[key].map(type => (type == null ? 'null' : Array.isArray(validationModel[key]) ? 'array' : typeof type())).join(' or ')}, got ${actualType}`);
			} else if (!Array.isArray(validationModel[key])) {
				const expectedTypeForProperty = isObject ? 'object' : validationModel[key] != null ? typeof validationModel[key]() : null;

				if (isFilter && actualType == 'undefined') continue;
				if (expectedTypeForProperty == null && data[key] == null) continue;
				else if (actualType !== expectedTypeForProperty) throw new Error(`Invalid type for property "${key}". Expected ${expectedTypeForProperty}, got ${actualType}`);
			}
		}

		this.#validateExtraProperties(data, validationModel);
	}

	/**
	 * Create documents.
	 * @param {...object} objects - Objects to create.
	 * @returns {Promise<{_id: string, created: true, reason?: string}[]>} The created document or an array of created documents.
	 */
	async create(...objects) {
		return this._create(objects);
	}

	async _create(objects, distributorID = undefined) {
		for (const object of objects) this.#validateModel(object, false, undefined, true);
		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();

				this.#queue.set(requestID, {
					updateID: requestID,
					resolve: async ({ data, residue, distributorID: _distributorID }) => {
						if (data === null && _distributorID.length) {
							this.#distributors.set(_distributorID, { documents: [], residue: !residue ? 1 : residue });

							while (this.#distributors.get(_distributorID).residue > 0) {
								const distributor = this.#distributors.get(_distributorID);
								const response = await this._create([], _distributorID);

								distributor.documents.push(...response.data);
								distributor.residue = response.residue;
							}

							resolve(this.#distributors.get(_distributorID).documents);
							this.#distributors.delete(_distributorID);
						} else resolve(distributorID ? { residue, data } : data);
					},
					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'create', data: objects, requestID, distributorID, ...this.#data }));
			});

		const { data } = await axios.post(`${this.#client.link}/create`, {
			data: objects,
			distributorID,

			...this.#client.authorization,
			...this.#data,
		});

		requestHasError(data);

		if (data.distribute || data.data) {
			if (distributorID) {
				return { data: data.data, residue: data.residue };
			} else if (data.distribute) {
				let [distributor, id, response] = [1, data.distributorID, []];
				while (distributor > 0) {
					const { residue, data: documents } = await this._create([], id);
					distributor = residue;
					response.push(...documents);
				}

				return response;
			}
		} else return data;
	}

	/**
	 * Search documents.
	 * @param {object} filter - Filter to search.
	 * @param {string} distributorID - Distributor ID if exits.
	 * @returns {Promise<SearchResultItem[]>} The searched documents as an array.
	 */
	async search(filter = {}, distributorID = undefined) {
		filter = getFilters(filter);
		this.#validateModel(filter, true);

		if (distributorID && typeof distributorID != 'string') throw DISTRIBUTOR_ERROR;

		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();

				this.#queue.set(requestID, {
					updateID: requestID,

					resolve: async ({ data, residue, distributorID: _distributorID }) => {
						if (data === null && _distributorID.length) {
							this.#distributors.set(_distributorID, { documents: [], residue: !residue ? 1 : residue });

							while (this.#distributors.get(_distributorID).residue > 0) {
								const distributor = this.#distributors.get(_distributorID);
								const response = await this.search({}, _distributorID);

								distributor.documents.push(...response.data);
								distributor.residue = response.residue;
							}

							resolve(this.#distributors.get(_distributorID).documents);
							this.#distributors.delete(_distributorID);
						} else resolve(distributorID ? { residue, data } : data.slice(0, filter['$max'] || undefined).map(document => new DatabaseDocument(document, this)));
					},

					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'search', filter, requestID, distributorID, ...this.#data }));
			});

		const { data } = await axios.post(`${this.#client.link}/search`, {
			filter,
			distributorID,

			...this.#client.authorization,
			...this.#data,
		});

		requestHasError(data);

		if (data.distribute || data.data) {
			if (distributorID) {
				return { data: data.data, residue: data.residue };
			} else if (data.distribute) {
				let [distributor, id, response] = [1, data.distributorID, []];
				while (distributor > 0) {
					const { residue, data: documents } = await this.search({}, id);
					distributor = residue;
					response.push(...documents);
				}

				return response.map(document => new DatabaseDocument(document, this));
			}
		} else return data.map(document => new DatabaseDocument(document, this));
	}

	/**
	 * Search document.
	 * @param {object} filter - Filter to search.
	 * @returns {Promise<SearchResultItem | null>} The searched document.
	 */
	async searchOne(filter = {}) {
		filter = getFilters(filter);
		this.#validateModel(filter, true);

		if (!filter['$lt'] && !filter['$gt']) filter['$max'] = 1;
		else if (filter['$max']) delete filter['$max'];

		const data = await this.search(filter);
		return data.length ? data[0] : null;
	}

	/**
	 * Update documents that match the specified filter.
	 *
	 * @param {Object} [filter={}] - The filter to search for documents to update.
	 * @param {Object} [update={}] - The update object containing the modifications to apply.
	 * @returns {Promise<SaveResult[]>} A promise that resolves to the updated document or null if not found.
	 * @throws {Error} Throws an error if the update operation fails.
	 */

	async update(filter = {}, update = {}, distributorID = undefined) {
		if (distributorID && typeof distributorID != 'string') throw DISTRIBUTOR_ERROR;
		filter = getFilters(filter);

		this.#validateModel(filter, true);
		this.#validateModel(update, true);

		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();
				this.#queue.set(requestID, {
					updateID: requestID,

					resolve: async ({ data, residue, distributorID: _distributorID }) => {
						if (data === null && _distributorID.length) {
							this.#distributors.set(_distributorID, { documents: [], residue: !residue ? 1 : residue });

							while (this.#distributors.get(_distributorID).residue > 0) {
								const distributor = this.#distributors.get(_distributorID);
								const response = await this.update({}, {}, _distributorID);

								distributor.documents.push(...response.data);
								distributor.residue = response.residue;
							}

							resolve(this.#distributors.get(_distributorID).documents);
							this.#distributors.delete(_distributorID);
						} else resolve(distributorID ? { residue, data } : data);
					},
					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'update', data: [update], filter, requestID, distributorID, ...this.#data }));
			});

		const { data } = await axios.patch(this.#client.link, {
			data: {
				filter,
				update,
			},

			distributorID,
			...this.#client.authorization,
			...this.#data,
		});

		requestHasError(data);
		if (data.distribute || data.data) {
			if (distributorID) {
				return { data: data.data, residue: data.residue };
			} else if (data.distribute) {
				let [distributor, id, response] = [1, data.distributorID, []];
				while (distributor > 0) {
					const { residue, data: documents } = await this.update({}, {}, id);
					distributor = residue;
					response.push(...documents);
				}

				return response;
			}
		} else return data;
	}

	/**
	 * Perform an instant update on documents that match the specified filter.
	 *
	 * @param {Object} [filter={}] - The filter to search for documents to instantly update.
	 * @param {Object} [update={}] - The update object containing the modifications to apply.
	 * @returns {Promise<SaveResult[]>} A promise that resolves to the instantly updated document or null if not found.
	 * @throws {Error} Throws an error if the instant update operation fails.
	 */
	async instantUpdate(filter = {}, update = {}, distributorID = undefined) {
		if (distributorID && typeof distributorID != 'string') throw DISTRIBUTOR_ERROR;
		filter = getFilters(filter);

		this.#validateModel(filter, true);
		this.#validateModel(update, true);

		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();
				this.#queue.set(requestID, {
					updateID: requestID,

					resolve: async ({ data, residue, distributorID: _distributorID }) => {
						if (data === null && _distributorID.length) {
							this.#distributors.set(_distributorID, { documents: [], residue: !residue ? 1 : residue });

							while (this.#distributors.get(_distributorID).residue > 0) {
								const distributor = this.#distributors.get(_distributorID);
								const response = await this.instantUpdate({}, {}, _distributorID);

								distributor.documents.push(...response.data);
								distributor.residue = response.residue;
							}

							resolve(this.#distributors.get(_distributorID).documents);
							this.#distributors.delete(_distributorID);
						} else resolve(distributorID ? { residue, data } : data);
					},
					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'instantUpdate', data: [update], filter, requestID, distributorID, ...this.#data }));
			});

		const { data } = await axios.put(this.#client.link, {
			data: {
				filter,
				update,
			},

			distributorID,
			...this.#client.authorization,
			...this.#data,
		});

		requestHasError(data);

		if (data.distribute || data.data) {
			if (distributorID) {
				return { data: data.data, residue: data.residue };
			} else if (data.distribute) {
				let [distributor, id, response] = [1, data.distributorID, []];
				while (distributor > 0) {
					const { residue, data: documents } = await this.instantUpdate({}, {}, id);
					distributor = residue;
					response.push(...documents);
				}

				return response;
			}
		} else return data;
	}
	/**
	 * Search for a document using the specified filter, and if not found, create a new document with the provided data.
	 *
	 * @param {Object} filter - The filter to search for an existing document.
	 * @param {Object} data - The data to use for creating a new document if not found.
	 * @returns {Promise<{data: SearchResultItem, created: boolean}>} A promise that resolves to the found or newly created document.
	 * @throws {Error} Throws an error if the search or creation operation fails.
	 */
	async searchOrCreate(filter = {}, create = {}) {
		filter = getFilters(filter);

		this.#validateModel(filter, true);
		this.#validateModel(create, true);

		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();
				this.#queue.set(requestID, {
					updateID: requestID,

					resolve: ({ data }) =>
						resolve({
							created: data.created,
							data: new DatabaseDocument(data.data, this),
						}),
					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'searchOrCreate', data: [create], filter, requestID, ...this.#data }));
			});

		const { data } = await axios.post(`${this.#client.link}/searchOrCreate`, {
			filter,
			data: create,
			...this.#client.authorization,
			...this.#data,
		});

		requestHasError(data);
		return {
			created: data.created,
			data: new DatabaseDocument(data.data, this),
		};
	}

	/**
	 * Delete documents based on the specified filter.
	 *
	 * @param {Object} filter - The filter to identify documents to be deleted.
	 * @returns {Promise<DeleteResult[]>} A promise that resolves to the result of the delete operation.
	 * @throws {Error} Throws an error if the delete operation fails.
	 */
	async delete(filter = {}, distributorID = undefined) {
		console.log(distributorID);
		if (distributorID && typeof distributorID != 'string') throw DISTRIBUTOR_ERROR;
		filter = getFilters(filter);

		this.#validateModel(filter, true);

		if (this.#client.method == 'WS')
			return new Promise(async (resolve, reject) => {
				if (!this.#client.connected)
					await new Promise(resolve => {
						const interval = setInterval(() => {
							if (this.#client.connected) {
								clearInterval(interval);
								resolve();
							}
						}, CONNECTION_CHECK_INTERVAL);
					});

				const requestID = generateUpdateID();
				this.#queue.set(requestID, {
					updateID: requestID,

					resolve: async ({ data, residue, distributorID: _distributorID }) => {
						if (data === null && _distributorID.length) {
							this.#distributors.set(_distributorID, { documents: [], residue: !residue ? 1 : residue });

							while (this.#distributors.get(_distributorID).residue > 0) {
								const distributor = this.#distributors.get(_distributorID);
								const response = await this.delete({}, _distributorID);

								distributor.documents.push(...response.data);
								distributor.residue = response.residue;
							}

							resolve(this.#distributors.get(_distributorID).documents);
							this.#distributors.delete(_distributorID);
						} else resolve(distributorID ? { residue, data } : data);
					},
					reject,
				});

				clients.get(this.#client.clientID).send(JSON.stringify({ method: 'delete', filter, requestID, distributorID, ...this.#data }));
			});

		const { data } = await axios.delete(this.#client.link, {
			data: {
				filter,
				distributorID,

				...this.#client.authorization,
				...this.#data,
			},
		});

		requestHasError(data);
		if (data.distribute || data.data) {
			if (distributorID) {
				return { data: data.data, residue: data.residue };
			} else if (data.distribute) {
				let [distributor, id, response] = [1, data.distributorID, []];
				while (distributor > 0) {
					const { residue, data: documents } = await this.delete({}, id);
					distributor = residue;
					response.push(...documents);
				}

				return response;
			}
		} else return data;
	}

	/**
	 * Count the number of documents that match the specified filter.
	 *
	 * @param {Object} filter - The filter to match documents.
	 * @returns {Promise<number>} A promise that resolves to the count of matching documents.
	 * @throws {Error} Throws an error if the count operation fails.
	 */
	async count(filter = {}) {
		filter = getFilters(filter);
		this.#validateModel(filter, true);

		if (!Object.keys(filter).length) {
			try {
				const list = await (
					await axios.get(
						`${this.#client.listLink}/list?${Object.keys(this.#client.authorization)
							.map(key => `${key}=${this.#client.authorization[key]}`)
							.join('&')}`
					)
				).data;

				return list.find(db => db.name == this.#data.database).collections.find(collection => collection.name == this.#data.collection).count;
			} catch {
				return 0;
			}
		} else return (await this.search(Object.assign(filter, { $only: [''] }))).length;
	}
};
