'use strict';

const Homey = require('homey');

class MeshDevice extends Homey.Device {
	
	onInit( protocolId ) {
		super.onInit();
		
		this._protocolId = protocolId;
		this._debugEnabled = false;
		
		if( this._protocolId === 'zwave' )
			this._manager = Homey.ManagerZwave;
		
		if( this._protocolId === 'zigbee' )
			this._manager = Homey.ManagerZigBee;
				
		this._manager.getNode( this )
			.then( node => {
				this.node = node;
				
				process.nextTick(() => {
					this.onMeshInit && this.onMeshInit();
					this.emit('__meshInit');
				});
			})
			.catch( this.error );
	}
	
	_debug() {
		if( this._debugEnabled ) {
			this.log.bind( this, '[dbg]' ).apply( this, arguments );
		}
	}
	
	setDebug( value ) {
		this._debugEnabled = ( value ) ? true : false;
	}
	
}

module.exports = MeshDevice;