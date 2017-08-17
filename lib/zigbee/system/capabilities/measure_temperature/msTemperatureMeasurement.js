'use strict';

module.exports = {
	get: 'measuredValue',
	reportParser(value) { 
		return value / 100;
	},
	report: 'measuredValue',
};
