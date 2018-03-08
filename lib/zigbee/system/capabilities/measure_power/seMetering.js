'use strict';

module.exports = {
  get: 'instantaneousDemand',
  reportParser(value) {
    const instantaneousDemandFactor = this.InstantaneousDemandFactor || 1
    if (value === -2) return;
    return value / instantaneousDemandfactor;
  },
  report: 'instantaneousDemand',
  getOpts: {
    getOnStart: true,
  },
};
