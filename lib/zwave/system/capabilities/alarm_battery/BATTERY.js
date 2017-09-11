'use strict';

module.exports = {
	report: 'BATTERY_REPORT',
	reportParser(report) {
		return report['Battery Level'] === 'battery low warning';
	},
};
