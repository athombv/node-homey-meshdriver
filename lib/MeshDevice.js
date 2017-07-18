'use strict';

const Homey = require('homey');

/**
 */
class MeshDevice extends Homey.Device {
	
	/**
	 * @private
	 */
	onInit( protocolId ) {
		super.onInit();
		
		this._protocolId = protocolId;
		this._debugEnabled = false;
		this._pollIntervals = {};
		
		if( this._protocolId === 'zwave' )
			this._manager = Homey.ManagerZwave;
		
		if( this._protocolId === 'zigbee' )
			this._manager = Homey.ManagerZigBee;
				
		this._manager.getNode( this )
			.then( node => {
				this.node = node;
				
				process.nextTick(() => {
					this.emit('__meshInit');
				});
			})
			.catch( err => {
				this.error( err );
				this.setUnavailable( err );
			});
	}
	
	_debug() {
		if( this._debugEnabled ) {
			this.log.bind( this, '[dbg]' ).apply( this, arguments );
		}
	}
	
	/**
	 * Enable debugging to the console
	 */
	enableDebug() {
		this._debugEnabled = true;
	}
	
	/**
	 * Disable debugging to the console
	 */
	disableDebug() {
		this._debugEnabled = false;
	}

	/**
	 * Remove all listeners and intervals from node
	 */
	onDeleted() {

		// Remove listeners on node
		if (this.node) this.node.removeAllListeners();

		// Clear all pollIntervals
		Object.keys(this._pollIntervals).forEach(capabilityId => {
			Object.values(this._pollIntervals[capabilityId]).forEach(interval => {
				clearInterval(interval);
			});
		});
	}
}

module.exports = MeshDevice;