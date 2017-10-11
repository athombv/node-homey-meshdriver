'use strict';

const ZwaveMeteringDevice = require('homey-meshdriver').ZwaveMeteringDevice;

class ZwaveLightDevice extends ZwaveMeteringDevice {
	async onMeshInit(options = {}) {

		// If nothing specified, default to auto registering system capabilities
		if (!options.hasOwnProperty('autoRegisterSystemCapabilities')) options.autoRegisterSystemCapabilities = true;

		// Default automatically register system capabilities
		await super.onMeshInit(options);
	}
}

module.exports = ZwaveLightDevice;
