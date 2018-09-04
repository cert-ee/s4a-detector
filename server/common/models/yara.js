'use strict';
const fs = require("fs");
// const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "yara"});

module.exports = function (yara) {

  const PATH_MOLOCH_YARA_OUT = process.env.PATH_MOLOCH_YARA_OUT;

  /**
   * INITIALIZE YARA
   *
   * create defaults
   */
  yara.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

      let default_yara = [
        {
          name: "checksum",
          friendly_name: "Checksum",
          description: "Yara rules checksum",
          data: "empty"
        },
        {
          name: "busy",
          friendly_name: "Busy",
          description: "Importing in progress, wait",
          data: false
        }
      ];
      // await yara.destroyAll();

      hell.o("check default_yara", "initialize", "info");
      let create_result;
      for (const dy of default_yara) {
        hell.o(["check setting", dy.name], "initialize", "info");
        create_result = await yara.findOrCreate({where: {name: dy.name}}, dy);
        if (!create_result) throw new Error("failed to create yara " + dy.name);

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
  yara.yara_routine_active = false;
  yara.checkRoutine = function (options, cb) {
    hell.o("start", "checkRoutine", "info");

    if (!yara.app.models.central.CENTRAL_ACTIVATED) {
      hell.o("central is not activated yet, return", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "not_approved"});
    }
    if (yara.yara_routine_active) {
      hell.o("is already running, busy", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }

    yara.yara_routine_active = false;

    (async function () {
      try {

        const yara_checksum = await yara.findOne({where: {name: "checksum"}});

        let central_input = {checksum: yara_checksum.data};
        let central_result;
        try {
          hell.o(["central input ", central_input], "checkRoutine", "info");
          central_result = await yara.app.models.central.connector().post("/report/yara", central_input);
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        if (central_result.data.checksum === yara_checksum.data && central_result.data.yara.length == 0) {
          hell.o("same checksum, nothing to update", "checkRoutine", "info");
        } else {
          hell.o("new checksum, go to apply new rules", "checkRoutine", "info");
          await yara.applyNewRules(central_result.data.yara);
          await yara.update({name: "checksum"}, {data: central_result.data.checksum});
        }

        hell.o("done", "checkRoutine", "info");
        yara.yara_routine_active = false;
        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "checkRoutine", "error");

        yara.yara_routine_active = false;
        cb({name: "error", status: 400, message: err.message});
      }

    })(); // async

  };

  yara.remoteMethod('checkRoutine', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/checkRoutine', verb: 'get', status: 200}
  });

  /**
   * APPLY NEW RULES
   *
   * and reload moloch
   *
   * @param cb
   */
  yara.applyNewRules = async function (input, cb) {
    hell.o("start", "applyNewRules", "info");

    try {

      hell.o("start write to file", "applyNewRules", "info");
      let file = fs.createWriteStream(PATH_MOLOCH_YARA_OUT);

      file.on('error', function (err) {
        hell.o(err, "applyNewRules", "error");
      });

      file.write(input + '\n');

      file.end();

      hell.o("end of yara write to file", "applyNewRules", "info");

      hell.o("restart moloch to reload rules file", "applyNewRules", "info");
      let salt_result = await yara.app.models.component.stateApply("moloch", "restart");
      hell.o(["salt result", salt_result], "applyNewRules", "info");
      if (!salt_result || salt_result.exit_code != 0) throw new Error("component_restart_failed");

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
