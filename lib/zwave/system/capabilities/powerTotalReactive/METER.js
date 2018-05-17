'use strict';
/**
 * Power Factor -> Scale 0x06 (version 3)
 * Apparent total -> Scale 0x01 (version 2)
 *
 * Reactive total -> Scale 0x07 Scale2 0x01 (kVarh)
 */
module.exports = {
	get: 'METER_GET',
	getParserV4: () => ({
		Properties1: {
			'Rate Type': 'Import',
			Scale: 7,
		},
		'Scale 2': 1,
	}),
	report: 'METER_REPORT',
	reportParserV4: report => { // TODO: fix report parser for scale 2
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
