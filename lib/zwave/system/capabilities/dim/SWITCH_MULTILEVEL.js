'use strict';

const util = require('./../../../../util');

const FACTORY_DEFAULT_DIMMING_DURATION = 'Factory Default';

module.exports = {
	get: 'SWITCH_MULTILEVEL_GET',
	set: 'SWITCH_MULTILEVEL_SET',
	setParserV1: value => ({
		Value: Math.round(value * 99),
	}),
	setParserV2: (value, options) => {
		const duration = (options.hasOwnProperty('duration') ? util.calculateZwaveDimDuration(options.duration) : FACTORY_DEFAULT_DIMMING_DURATION);
		return {
			Value: Math.round(value * 99),
			'Dimming Duration': duration,
		};
	},
	report: 'SWITCH_MULTILEVEL_REPORT',
	reportParserV1: report => {
		if (report && report.hasOwnProperty('Value (Raw)')) {
			if (report['Value (Raw)'][0] === 255) return 1;
			return report['Value (Raw)'][0] / 99;
		}
		return null;
	},
	reportParserV4: report => {
		if (report && report.hasOwnProperty('Current Value (Raw)')) {
			if (report['Current Value (Raw)'][0] === 255) return 1;
			return report['Current Value (Raw)'][0] / 99;
		}
		return null;
	},
};
