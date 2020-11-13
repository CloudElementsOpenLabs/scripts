const { getEnv } = require('./helpers');

const checkEnv = () => {
  const env = getEnv();
  const errors = [];

  for (const key in env) {
    if (env.hasOwnProperty(key) && isInvalid(env[key])) {
      errors.push(`ERROR: expected value for ${key} in .env, got null or undefined.`);
    }
  }

  if (doesNotInclude(['STAGING', 'US_PROD', 'EU_PROD'], env.ceEnv)) {
    errors.push(`ERROR: expected value for CE_ENV in .env to be one of the following: 'STAGING', 'US_PROD', 'EU_PROD', but found ${env.ceEnv}.`);
  }

  if (doesNotInclude(['GET', 'DELETE'], env.mode)) {
    errors.push(`ERROR: expected value for MODE in .env to be one of the following: 'GET', 'CREATE', 'DELETE', but found ${env.mode}.`);
  }

  env.templateIds.forEach(id => {
    if (isNaN(id)) {
      errors.push(`ERROR: expected value for formula template ID in .env to be integer, but found ${id}.`);
    }
  });

  if (errors.length > 0) {
    console.error('ERROR: found the following errors while checking the environment variables required for running this script.');
    errors.forEach(e => console.error(e));
    process.exit(1);
  }
};

// -- Private --
const isInvalid = (v) => v == null || v == undefined;
const doesNotInclude = (list, val) => !list.includes(val);

module.exports = { checkEnv };