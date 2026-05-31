const { getGuildConfig } = require('./firebaseService');
const defaultUI = require('./ui/defaultUI');

const getUI = async (guildId, moduleName) => {
    const config = await getGuildConfig(guildId);
    const customUI = config.customUI || {};

    const moduleDefaults = defaultUI[moduleName] || {};
    const moduleCustoms = customUI[moduleName] || {};

    return new Proxy(moduleDefaults, {
        get: (target, prop) => {
            return moduleCustoms[prop] || target[prop];
        }
    });
};

const formatUI = (text, variables) => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replaceAll(`{${key}}`, value);
    }
    return result;
};

module.exports = { defaultUI, getUI, formatUI };