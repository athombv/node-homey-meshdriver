'use strict';

module.exports['BASIC'] = {
	
	get: 'BASIC_GET',
	getParser: () => {
		return {};
	}
	set: 'BASIC_SET',
	setParser: ( value ) => {
		return {
			"Value": ( value ) ? 0x00 : 0xFF
		}
	},
	report: 'BASIC_REPORT',
	reportParser: ( value ) => {
		console.log('reportParser', value);
		return value === 0xFF;
	}
	
}