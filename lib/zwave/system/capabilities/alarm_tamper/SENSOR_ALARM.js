'use strict';

module.exports = {
	get: 'SENSOR_ALARM_GET',
	getParser: () => ({
		'Sensor Type': 'General Purpose Alarm',
	}),
	report: 'SENSOR_ALARM_REPORT',
	reportParser: report => {
		if (report) {
			if (report.hasOwnProperty('Sensor Type')) {
				return report['Sensor Type'] !== 'General Purpose Alarm';
			} else if (report.hasOwnProperty('Sensor State')) {
				return report['Sensor State'] === 'alarm';
			}
		}
		return null;
	},
};
