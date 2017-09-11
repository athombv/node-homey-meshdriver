'use strict';

module.exports = {
	get: 'SWITCH_BINARY_GET',
	set: 'SWITCH_BINARY_SET',
	//V1 parser
	setParserV1: value => ({
		'Switch Value': (value) ? 'on/enable' : 'off/disable',
	}),
	// V2 parser
	setParser: value => ({
		'Switch Value': (value) ? 'on/enable' : 'off/disable',
		'Duration': 'Default'
	}),
	report: 'SWITCH_BINARY_REPORT',
	reportParser: report => {
		if (report && report.hasOwnProperty('Value')) {
			if (report.Value === 'on/enable') return true;
			else if (report.Value === 'off/disable') return false;
		}
		return null;
	},
};
