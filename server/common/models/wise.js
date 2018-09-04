'use strict';
const fs = require("fs");
// const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "wise"});

module.exports = function (wise) {

  const PATH_MOLOCH_WISE_IP_OUT = process.env.PATH_MOLOCH_WISE_IP_OUT;
  const PATH_MOLOCH_WISE_URL_OUT = process.env.PATH_MOLOCH_WISE_URL_OUT;
  const PATH_MOLOCH_WISE_DOMAIN_OUT = process.env.PATH_MOLOCH_WISE_DOMAIN_OUT;

  /**
   * INITIALIZE wise
   *
   * create defaults
   */
  wise.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

      let default_wise = [
        {
          name: "checksum",
          friendly_name: "Checksum",
          description: "Wise checksum",
          data: "empty"
        },
        {
          name: "busy",
          friendly_name: "Busy",
          description: "Importing in progress, wait",
          data: false
        }
      ];
      // await wise.destroyAll();

      hell.o("check default_wise", "initialize", "info");
      let create_result;
      for (const dw of default_wise) {
        hell.o(["check setting", dw.name], "initialize", "info");
        create_result = await wise.findOrCreate({where: {name: dw.name}}, dw);
        if (!create_result) throw new Error("failed to create wise " + dw.name);

      }

      hell.o("done", "initialize", "info");

      return true;
    } catch (err) {
      hell.o(err, "initialize", "err");
      return false;
    }

  };

  /**
   * CHECK NEW YARA FROM CENTRAL
   *
   * @param cb
   */
  wise.wise_routine_active = false;
  wise.checkRoutine = function (options, cb) {
    hell.o("start", "checkRoutine", "info");

    if (!wise.app.models.central.CENTRAL_ACTIVATED) {
      hell.o("central is not activated yet, return", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "not_approved"});
    }
    if (wise.wise_routine_active) {
      hell.o("is already running, busy", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }

    wise.wise_routine_active = false;

    (async function () {
      try {

        const wise_checksum = await wise.findOne({where: {name: "checksum"}});

        let central_input = {checksum: wise_checksum.data};
        let central_result;
        try {
          hell.o(["central input ", central_input], "checkRoutine", "info");
          central_result = await wise.app.models.central.connector().post("/report/wise", central_input);
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }
          throw new Error(out);
        }

        if (central_result.data.checksum === wise_checksum.data && central_result.data.wise_ip.length == 0) {
          hell.o("same checksum, nothing to update", "checkRoutine", "info");
        } else {
          hell.o("new checksum, go to apply new rules", "checkRoutine", "info");
          await wise.applyNewRules(central_result.data);
          hell.o(["new checksum", central_result.data.checksum], "checkRoutine", "info");
          await wise.update({name: "checksum"}, {data: central_result.data.checksum});
        }

        hell.o("done", "checkRoutine", "info");
        wise.wise_routine_active = false;
        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "checkRoutine", "error");

        wise.wise_routine_active = false;
        cb({name: "error", status: 400, message: err.message});
      }

    })(); // async

  };

  wise.remoteMethod('checkRoutine', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/checkRoutine', verb: 'get', status: 200}
  });

  // rule.checkRoutine();

  /**
   * APPLY NEW RULES
   *
   * and reload moloch
   *
   * @param cb
   */
  wise.applyNewRules = function async(input, cb) {
    hell.o("start", "applyNewRules", "info");

    try {

      let wise_paths = {
        "wise_ip": PATH_MOLOCH_WISE_IP_OUT,
        "wise_url": PATH_MOLOCH_WISE_URL_OUT,
        "wise_domain": PATH_MOLOCH_WISE_DOMAIN_OUT
      };

      let file = {};
      for (const wise_type in wise_paths) {

        file[wise_type] = fs.createWriteStream(wise_paths[wise_type]);
        file[wise_type].on('error', function (err) {
          hell.o(err, "applyNewRules", "error");
        });
        file[wise_type].write(input[wise_type] + '\n');
        file[wise_type].end();
      }
      hell.o("end of wise write to file", "applyNewRules", "info");

      // hell.o("restart moloch to reload rules file", "applyNewRules", "info");
      // let salt_result = await wise.app.models.component.stateApply("moloch", "restart");
      // hell.o(["salt result", salt_result], "applyNewRules", "info");
      // if (!salt_result || salt_result.exit_code != 0) throw new Error("component_restart_failed");

      hell.o("done", "applyNewRules", "info");

      if (cb) cb(null, {message: "ok"});
      return true;
    } catch (err) {
      hell.o(err, "applyNewRules", "error");
      if (cb) cb({name: "Error", status: 400, message: err.message});
      return false;
    }

  };

};
