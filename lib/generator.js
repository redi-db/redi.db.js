const defaultValue = 100000000;
const resetValue = 500000000;

let uid = defaultValue;
module.exports = {
	generateUpdateID: function () {
		if (uid >= resetValue) uid = defaultValue;
		uid++;

		const randValue = Math.floor(Math.random() * (99999 - 10000)) + 10000;
		const value = parseInt(uid + randValue);

		return value;
	},
};
