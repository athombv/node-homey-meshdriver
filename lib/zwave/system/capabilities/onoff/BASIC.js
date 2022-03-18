'use strict';

module.exports = {
	get: 'BASIC_GET',
	set: 'BASIC_SET',
	setParser: value => ({
		Value: (value) ? 255 : 0,
	}),
	report: 'BASIC_REPORT',
	reportParserV1(report) {
		if (report && report.hasOwnProperty('Value')) {
			return report['Value'] > 0;
		}
		return null;
	},
	reportParserV2(report) {
		if (report && report.hasOwnProperty('Current Value')) {
			return report['Current Value'] > 0;
		}
		return null;
	},
};
