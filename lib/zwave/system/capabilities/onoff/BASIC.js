'use strict';

module.exports = {
	get: 'BASIC_GET',
	set: 'BASIC_SET',
	setParser: value => ({
		Value: (value) ? 255 : 0,
	}),
	report: 'BASIC_REPORT',
	reportParser(report) {
		if (report && (report.hasOwnProperty('Value') || report.hasOwnProperty('Current Value'))) {
			const value = report['Value'] !== undefined ? report['Value'] : report['Current Value'];
			return value > 0;
		}
		return null;
	},
};
