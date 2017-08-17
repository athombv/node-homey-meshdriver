'use strict';

module.exports = {
	get: 'METER_GET',
	getParser: () => ({
		'Sensor Type': 'Electric meter',
		Properties1: {
			Scale: 2,
		},
	}),
	report: 'METER_REPORT',
	reportParser: report => {
		if (report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 2) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
};
