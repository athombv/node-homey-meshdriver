'use strict';

module.exports = {
	report: 'SENSOR_MULTILEVEL_REPORT',
	reportParser: report => {
		if (report.hasOwnProperty('Sensor Type') && report.hasOwnProperty('Sensor Value (Parsed)')) {
			if (report['Sensor Type'] === 'CO2-level (version 3)') return report['Sensor Value (Parsed)'];
		}
		return null;
	},
};
