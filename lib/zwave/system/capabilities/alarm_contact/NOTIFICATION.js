'use strict';

module.exports = {
	get: 'NOTIFICATION_GET',
	getParser: () => ({
		'V1 Alarm Type': 0,
		Event: 23,
		'Notification Type': 'Access Control',
	}),
	report: 'NOTIFICATION_REPORT',
	reportParser: report => {
		if (report && report.hasOwnProperty('Notification Type') && report['Notification Type'] === 'Access Control') {
			if (report['Event (Parsed)'] === 'Window/Door is open') return true;
			else if (report['Event (Parsed)'] === 'Window/Door is closed') return false;
		}
		return null;
	},
};
