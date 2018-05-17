'use strict';
/**
 * Power Factor -> Scale 0x06 (version 3)
 */
module.exports = {
	get: 'METER_GET',
	getOpts: {
		getOnStart: true,
	},
	getParserV3: () => {
		console.log('getParserV3()');
		return {
			Properties1: {
				'Rate Type': 'Import',
				Scale: 6,
			},
		};
	},
	report: 'METER_REPORT',
	reportParserV3: report => { // TODO: fix report parser for scale (maybe for all METER report parsers?
		if (report &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Meter Type') &&
			(report.Properties1['Meter Type'] === 'Electric meter' || report.Properties1['Meter Type'] === 1) &&
			report.Properties1.hasOwnProperty('Scale bit 2') &&
			report.Properties1['Scale bit 2'] === true &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 0) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
};
