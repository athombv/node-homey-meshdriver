'use strict';

const util = require('./../../../../util');

function map(inputStart, inputEnd, outputStart, outputEnd, input) {
	return outputStart + ((outputEnd - outputStart) / (inputEnd - inputStart)) * (input - inputStart);
}

module.exports = {
	set : 'SWITCH_COLOR_SET',
	setParser(value) {

		let lightTemperature = this.getCapabilityValue('light_temperature');

		// If value above 0.5 construct warm white value
		let ww = (lightTemperature >= 0.5) ? map(0.5, 1, 10, 255, lightTemperature) : 0;

		// If value below 0.5 construct cool white value
		let cw = (lightTemperature < 0.5) ? map(0, 0.5, 255, 10, lightTemperature) : 0;

		// Convert current HSV values to rgb
		let rgb = util.convertHSVToRGB({
			hue: this.getCapabilityValue('light_hue'),
			saturation: this.getCapabilityValue('light_saturation'),
			value: this.getCapabilityValue('dim')
		});

		// If new mode is color set ww and cw to zero
		if (value === 'color') {
			ww = 0;
			cw = 0;
		} else {

			// New mode is temperature set rgb to zero
			rgb.red = 0;
			rgb.green = 0;
			rgb.blue = 0;
		}
		
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