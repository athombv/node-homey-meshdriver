'use strict';

const Homey = require('homey');
const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

class ZwaveMeteringDevice extends ZwaveDevice {
	async onMeshInit(options = {}) {

		// If nothing specified, default to auto registering system capabilities
		if (!options.hasOwnProperty('autoRegisterSystemCapabilities')) options.autoRegisterSystemCapabilities = true;

		// Default automatically register system capabilities
		await super.onMeshInit(options);

		// If node has CC METER and METER_RESET functionality
		const commandClassMeter = this.getCommandClass('METER');
		if (commandClassMeter && !(commandClassMeter instanceof Error) && commandClassMeter.METER_RESET === 'function') {

			// Register Flow card trigger
			const _flowTriggerResetMeter = new Homey.FlowCardAction('resetMeter');
			_flowTriggerResetMeter.register();

			// Check if Flow card is registered in app manifest
			if (!(_flowTriggerResetMeter instanceof Error)) {

				_flowTriggerResetMeter.registerRunListener(() => {
					commandClassMeter.METER_RESET({}, (err, result) => {
						if (err || result !== 'TRANSMIT_COMPLETE_OK') return Promise.reject(err || result);
						return Promise.resolve();
					});
				});
			} else this.error('missing_resetMeter_flow_card_in_manifest');
		}
	}
}

module.exports = ZwaveMeteringDevice;
