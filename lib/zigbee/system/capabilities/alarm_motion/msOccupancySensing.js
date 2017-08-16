'use strict';

module.exports = {
	get: 'occupancy',
	reportParser: value => {
		console.log(value);
		if (value === 1) return true;
		return false;
	},
	report: 'occupancy',
};
