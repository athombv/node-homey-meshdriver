'use strict';

module.exports = {
	
	get: 'BASIC_GET',
	
	set: 'BASIC_SET',
	setParser: ( value, opts ) => {
		return {
			"Value": ( value ) ? 0xFF : 0x00
		}
	},
	
	report: 'BASIC_REPORT',
	reportParser: ( value ) => {
		return value['Value'] === 0xFF;
	}
	
}