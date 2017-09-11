'use strict';

module.exports = {
	report: 'SENSOR_MULTILEVEL_REPORT',
	reportParser: report => {
		if (report.hasOwnProperty('Sensor Type') && report.hasOwnProperty('Sensor Value (Parsed)')) {
			if (report['Sensor Type'] === 'Particulate Matter 2.5 (v7)') return report['Sensor Value (Parsed)'];
		}
		return null;
	},
};
