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
  reportParserV1(report) {
    if (report && report.hasOwnProperty('Value')) {
      if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', report['Value'] > 0);
      if (report['Value'] > 99) return 1;
      return report['Value'] / 99;
    }
    return null;
  },
  reportParserV2(report) {
    if (report && report.hasOwnProperty('Current Value')) {
      if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', report['Current Value'] > 0);
      if (report['Current Value'] > 99) return 1;
      return report['Current Value'] / 99;
    }
    return null;
  },
};
