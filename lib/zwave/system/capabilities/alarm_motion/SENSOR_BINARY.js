'use strict';

module.exports = {
	get: 'SENSOR_BINARY_GET',
	report: 'SENSOR_BINARY_REPORT',
	reportParser: report => {
		if (report && report.hasOwnProperty('Sensor Value')) {
			return report['Sensor Value'] === 'detected an event';
		}
		return null;
	},
};
