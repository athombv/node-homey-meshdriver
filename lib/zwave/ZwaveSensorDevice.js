'use strict';

const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

class ZwaveSensorDevice extends ZwaveDevice {
	async onMeshInit(options = {}) {

		// Default automatically register system capabilities
		await super.onMeshInit({
			autoRegisterSystemCapabilities: options.hasOwnProperty('autoRegisterSystemCapabilities') ? options.autoRegisterSystemCapabilities : true,
		});
	}
}

module.exports = ZwaveSensorDevice;
