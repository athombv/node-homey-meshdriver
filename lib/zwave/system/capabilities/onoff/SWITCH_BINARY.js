'use strict';

module.exports = {

	get: 'SWITCH_BINARY_GET',
	
	set: 'SWITCH_BINARY_SET',
	setParser: ( value ) => {
		return {
			"Switch Value": ( value ) ? 0xFF : 0x00
		}
	},
	
	report: 'SWITCH_BINARY_REPORT',
	reportParser: ( data ) => {
		return data['Value'] === 'on/enable';
	}
	
}