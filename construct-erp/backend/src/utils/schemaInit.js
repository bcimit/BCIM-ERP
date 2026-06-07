const logger = require('./logger');

let queue = Promise.resolve();

const runSchemaInit = (name, task) => {
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_SCHEMA_INIT === 'true') {
    return Promise.resolve();
  }

  queue = queue
    .then(() => task())
    .catch((err) => {
      logger.warn(`[schema-init] ${name} skipped: ${err.message}`);
    });

  return queue;
};

module.exports = { runSchemaInit };
