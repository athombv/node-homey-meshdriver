'use strict';

const Homey = require('homey');

class MeshDevice extends Homey.Device {
	
	onInit( protocolId ) {
		super.onInit();
		
		this._protocolId = protocolId;
		
		if( this._protocolId === 'zwave' )
			this._manager = Homey.ManagerZwave;
		
		if( this._protocolId === 'zigbee' )
			this._manager = Homey.ManagerZigBee;
				
		this._manager.getNode( this )
			.then( node => {
				this.node = node;
				
				process.nextTick(() => {
					this.onMeshInit && this.onMeshInit();
				});
			})
			.catch( this.error );
	}
	
}

module.exports = MeshDevice;