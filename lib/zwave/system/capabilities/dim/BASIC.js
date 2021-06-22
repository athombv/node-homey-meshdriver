'use strict';

module.exports = {
	get: 'BASIC_GET',
	set: 'BASIC_SET',
	setParser(value) {
		if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0);
		return {
			Value: Math.round(value * 99),
		};
	},
	report: 'BASIC_REPORT',
	reportParser(report) {
		if (report && (report.hasOwnProperty('Value') || report.hasOwnProperty('Current Value'))) {
			const value = report['Value'] !== undefined ? report['Value'] : report['Current Value'];
			if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0);
			if (value > 99) return 1;
			return value / 99;
		}
		return null;
	},
};
