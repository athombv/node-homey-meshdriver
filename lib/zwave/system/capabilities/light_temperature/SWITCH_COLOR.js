'use strict';

const util = require('./../../../../util');

function map(inputStart, inputEnd, outputStart, outputEnd, input) {
	return outputStart + ((outputEnd - outputStart) / (inputEnd - inputStart)) * (input - inputStart);
}

module.exports = {
	set : 'SWITCH_COLOR_SET',
	setParser(value) {

		// If value above 0.5 construct warm white value
		let ww = (value >= 0.5) ? map(0.5, 1, 10, 255, value) : 0;

		// If value below 0.5 construct cool white value
		let cw = (value < 0.5) ? map(0, 0.5, 255, 10, value) : 0;

		// Convert current HSV values to rgb
		let rgb = util.convertHSVToRGB({
			hue: this.getCapabilityValue('light_hue'),
			saturation: this.getCapabilityValue('light_saturation'),
			value: 1
		});
		
		return {
			'Properties1': {
				'Color Component Count': 5
			},
			'vg1': [
				{
					'Color Component ID': 0, // WW
					'Value': ww
				},
				{
					'Color Component ID': 1, // CW
					'Value': cw
				},
				{
					'Color Component ID': 2, // R
					'Value': rgb.red
				},
				{
					'Color Component ID': 3, // G
					'Value': rgb.green
				},
				{
					'Color Component ID': 4, // B
					'Value': rgb.blue
				}
			]
		}
	}
};