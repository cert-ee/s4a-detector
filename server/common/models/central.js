'use strict';

const axios = require('axios');
const hell = new (require(__dirname + "/helper.js"))({module_name: "central"});

module.exports = function (central) {

  /**
   * LOAD CENTRAL INFORMATION
   *
   * additionally create axios connector with central api url
   *
   * @param input
   * @param cb
   */
  central.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

      hell.o(["CENTRAL API URL FROM ENV", process.env.CENTRAL_API_URL], "initialize", "info");

      let central_result, central_input = {};
      if (process.env.CENTRAL_API_URL) {
        central_input.central_api_url = process.env.CENTRAL_API_URL;
      } else {
        console.log("critical error, central api url missing !: ", process.env.CENTRAL_API_URL)
      }

      central_result = await central.findOne({where: {id: "centralid"}});

      if (!central_result) {
        hell.o(["no central info, create", ""], "initialize", "info");
        await central.create({id: "centralid"});
        central_result = await central.findOne({where: {id: "centralid"}});
      }

      //if ENV has changed
      if (central_result.central_api_url !== central_input.central_api_url) {
        hell.o(["central api url from ENV different", process.env.CENTRAL_API_URL], "initialize", "info");
        hell.o(["from old ENV value", central_result.central_api_url], "initialize", "info");
        hell.o(["update central api url to: ", central_result.central_api_url], "initialize", "info");
        await central.update({id: "centralid"}, {central_api_url: central_input.central_api_url});
        central_result = await central.findOne({where: {id: "centralid"}});
      }

      if (!central_result) throw new Error("load_failed");

      // hell.o(central_result, "initalize", "info");
      central.CENTRAL_ACTIVATED = central_result.central_activated;
      central.CENTRAL_TOKEN = central_result.central_token;
      central.CENTRAL_API = central_result.central_api_url;

      hell.o(["reinit axios with baseURL: ", central.CENTRAL_API], "initialize", "info");
      central.central_connection = axios.create({
        baseURL: central.CENTRAL_API,
        headers: {'X-Access-Token': central.CENTRAL_TOKEN}
      });
      central.central_connection.defaults.timeout = 600000; // 10 min

      hell.o("done", "initialize", "info");
      return true;
    } catch (err) {
      hell.o(err, "updateToken", "error");
      return false;
    }

  };


  /**
   * AXIOS CONNECTOR TO CENTRAL API
   */
  central.connector = function () {
    return central.central_connection;
  };


  /**
   * UPDATE TOKEN / API KEY
   *
   * @param input
   * @returns {Promise}
   */
  central.updateToken = async function (input) {
    hell.o("start", "updateToken", "info");

    try {
      let token_info = {
        central_token: input.token,
        central_activated: false
      };
      hell.o(["token", token_info], "updateToken", "info");

      if (!input.temporary) {
        hell.o("CENTRAL IS NOW TRUE", "updateToken", "info");
        token_info.central_activated = true;
        hell.o("permanent token", "updateToken", "info");
      }

      let central_result = await central.update({id: "centralid"}, token_info);
      if (!central_result) throw new Error("central_token_update_failed");

      hell.o("start", "going to reload central module", "info");
      await central.initialize();

      hell.o("done", "updateToken", "info");
      return central_result;

    } catch (err) {
      hell.o(err, "updateToken", "error");
      throw new Error(err);
      return false;
    }

  };


  /**
   * LAST CONNECTION TO CENTRAL TIME
   *
   * @param central_status
   * @param type
   * @param type_result
   */
  central.lastSeen = async function (central_status, type, type_result) {
    hell.o("start", "lastSeen", "info");

    try {
      let now = new Date();
      let central_input = {};

      if (central_status !== undefined && central_status !== null) {
        hell.o(["update last seen", central_status], "lastSeen", "info");

        central_input = {
          central_status: central_status,
          "last_central_check": now,
        };
      }

      /*
      central_status, last_central_check, last_central_update
      components_status, last_components_check, last_components_update
      rules_status, last_rules_check, last_rules_update
      alerts_status, last_alerts_check, last_alerts_update
       */
      if (type !== undefined && ["alerts", "central", "components", "rules", "wise", "yara"].includes(type)) {
        central_input[`last_${type}_check`] = now;
        hell.o([`last_${type}_check`, "lastSeen", now], "info");

        if (type_result !== undefined) {
          central_input[`${type}_status`] = type_result;
          central_input[`last_${type}_update`] = now;
          hell.o([`last_${type}_update`, type_result], "lastSeen", "info");
        }
      }

      central.update({id: "centralid"}, central_input);

      hell.o("done", "lastSeen", "info");
      return true;
    } catch (err) {
      hell.o(err, "lastSeen", "error");
      return false;
    }

  };

};

