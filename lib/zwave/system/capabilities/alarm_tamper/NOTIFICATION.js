'use strict';

module.exports = {
	get: 'NOTIFICATION_GET',
	getParser: () => ({
		'V1 Alarm Type': 0,
		Event: 3,
		'Notification Type': 'Home Security',
	}),
	report: 'NOTIFICATION_REPORT',
	reportParser: report => {
		if (report && report.hasOwnProperty('Notification Type') && report['Notification Type'] === 'Home Security') {
			if (report['Event (Parsed)'] === 'Tampering, Product covering removed') return true;
			else if (report['Event (Parsed)'] === 'Event inactive') return false;
		}
		return null;
	},
};
