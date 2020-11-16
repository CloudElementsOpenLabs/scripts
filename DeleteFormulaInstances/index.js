/*
  CAUTION: Running this script will delete formula instances as defined in readme.md, this action is permanent.
*/

require('dotenv').config();
const axios = require('axios');
const { checkEnv } = require('./env');
const { headers, baseUrl, getEnv } = require('./helpers');

const getInstances = async (templateId, token) => {
  const { ceEnv, userSecret, orgSecret } = getEnv();

  let url = `https://${baseUrl(ceEnv)}/elements/api-v2/formulas/${templateId}/instances`;
  if (token) {
    url = `${url}&nextPage=${token}`;
  }

  try {
    const res = await axios.get(url, { headers: headers(userSecret, orgSecret), timeout: 5000 });
    return res;
  } catch (e) {
    console.error(`Error: ${e.response.data.message}, requestId: ${e.response.data.requestId}`);
  }
};

const getPagedInstances = async (templateId) => {
  let results = [];
  let keepGoing = true;
  let nextPageToken;

  while (keepGoing) {
    let res = await getInstances(templateId, nextPageToken);

    if (res && res.status === 200) { await results.push.apply(results, res.data.map(d => d.id)); }

    if (res && res.status === 200 && res.headers["elements-next-page-token"]) {
      nextPageToken = res.headers["elements-next-page-token"]
    } else {
      keepGoing = false;
    }
  }

  return { templateId, results: results.flat() };
};

const getAllInstances = async (templateIds) => {
  return Promise.all(templateIds.map(t => getPagedInstances(t)));
};

const checkTemplateIds = async () => {
  const { templateIds } = getEnv();
  return (await Promise.all(templateIds.map(id => checkTemplateId(id)))).filter(t => t);
};

const checkTemplateId = async (templateId) => {
  const { ceEnv, userSecret, orgSecret } = getEnv();

  try {
    const res = await axios.get(`https://${baseUrl(ceEnv)}/elements/api-v2/formulas/${templateId}`, {
      headers: headers(userSecret, orgSecret),
      timeout: 5000
    });
    return res.data.id;
  } catch (e) {
    console.error(`Error: ${e.response.data.message}, requestId: ${e.response.data.requestId}`);
  }
};

const deleteInstances = async (templateId, instanceIds) => instanceIds.map(i => deleteInstance(templateId, i));

const deleteInstance = async (templateId, instanceId) => {
  const { ceEnv, userSecret, orgSecret } = getEnv();

  try {
    await axios.delete(`https://${baseUrl(ceEnv)}/elements/api-v2/formulas/${templateId}/instances/${instanceId}`, {
      headers: headers(userSecret, orgSecret),
      timeout: 5000
    });
  } catch (e) {
    console.error(`Error: ${e.response.data.message}, requestId: ${e.response.data.requestId}`);
  }
};

const deleteAllInstances = async (templates) => Promise.all(templates.map(async (t) => {
  const res = await deleteInstances(t.templateId, t.results);
  return {templateId: t.templateId, results: res};
}));

const start = async () => {
  const { mode, ceEnv } = getEnv();
  console.log(`INFO: Running script in ${mode} mode for Cloud Elements ${ceEnv}.`);
  
  const templateIds = await checkTemplateIds();
  console.log(`INFO: Found ${templateIds.length} valid template ID(s), skipping any invalid template ID(s).`);

  const instances = await getAllInstances(templateIds);

  instances.forEach(i => {
    console.log(`INFO: Formula template ID ${i.templateId} found ${i.results.length} instance(s).`);
  });

  if (mode === "DELETE") {
    const toDelete = instances.filter(i => i.results.length > 0);
    const deleted = await deleteAllInstances(toDelete);

    deleted.forEach(d => {
      console.log(`INFO: Formula template ID ${d.templateId} successfully deleted ${d.results.length} instance(s).`);
    });
  }
};

checkEnv();
start();

