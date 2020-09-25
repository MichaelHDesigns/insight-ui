const { merge } = require('lohelpthehomeless');

const startHelpthehomelessCore = require('@Altcoin-Cash/dp-services-ctl/lib/services/helpthehomelessCore/startHelpthehomelessCore');
const startInsightUi = require('./service-ctl/startInsightUI');

async function remove(services) {
  const insightDeps = [
    services.helpthehomelessCore,
  ];
  await Promise.all(insightDeps.map(instance => instance.remove()));
}

/**
 * @typedef InsightUI
 * @property {DapiCore} insightUi
 * @property {HelpthehomelessCore} helpthehomelessCore
 * @property {Promise<void>} clean
 * @property {Promise<void>} remove
 */

/**
 * Create Insight UI instance
 *
 * @param {object} [options]
 * @returns {Promise<InsightUI>}
 */
async function startInsightUI(options) {
  const instances = await startInsightUi.many(1, options);
  return instances[0];
}

/**
 * Create Insight UI instances
 *
 * @param {Number} number
 * @param {object} [options]
 * @returns {Promise<InsightUI[]>}
 */
startInsightUI.many = async function many(number, options = {}) {
  if (number < 1) {
    throw new Error('Invalid number of instances');
  }
  if (number > 1) {
    throw new Error("We don't support more than 1 instance");
  }


  const helpthehomelessCoreInstancesPromise = startHelpthehomelessCore.many(number, options.helpthehomelessCore);
  const [helpthehomelessCoreInstances] = await Promise.all([
    helpthehomelessCoreInstancesPromise,
  ]);

  const instances = [];

  for (let i = 0; i < number; i++) {
    const helpthehomelessCore = helpthehomelessCoreInstances[i];


    const insightUIOptions = {
      container: {},
      config: {},
      ...options.insightUI,
    };

    merge(insightUIOptions.config, {
      servicesConfig: {
        helpthehomelessd: {
          connect: [{
            rpchost: `${helpthehomelessCore.getIp()}`,
            rpcport: `${helpthehomelessCore.options.getRpcPort()}`,
            rpcuser: `${helpthehomelessCore.options.getRpcUser()}`,
            rpcpassword: `${helpthehomelessCore.options.getRpcPassword()}`,
            zmqpubrawtx: `tcp://host.docker.internal:${helpthehomelessCore.options.getZmqPorts().rawtx}`,
            zmqpubhashblock: `tcp://host.docker.internal:${helpthehomelessCore.options.getZmqPorts().hashblock}`,
          }],
        },
      },
    });


    const insightUIPromise = await startInsightUI(insightUIOptions);

    const [insightUi] = await Promise.all([
      insightUIPromise,
    ]);


    const instance = {
      insightUi,
      helpthehomelessCore,
      async clean() {
        await remove(instance);

        const newServices = await startInsightUI(options);

        Object.assign(instance, newServices);
      },
      async remove() {
        await remove(instance);
      },
    };

    instances.push(instance);
  }

  return instances;
};

module.exports = startInsightUI;
