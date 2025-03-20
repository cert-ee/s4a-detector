'use strict';
const fs = require("fs").promises;
// const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "yara"});

module.exports = function (yara) {

  /**
   * INITIALIZE YARA
   *
   * create defaults
   */
  yara.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

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
        let arkime = await yara.app.models.component.findOne({where: {name: 'arkime'}});
        if (!arkime.configuration.yara_enabled || !arkime.enabled) {
          hell.o("yara disabled, done", "checkRoutine", "info");
          cb(null, {message: "disabled"});
          return true;
        }


        let current_list = await yara.find({where: {enabled: true}});
        let central_input = {feeds: current_list}, central_result;
        try {
          hell.o(["central input ", central_input], "checkRoutine", "info");
          central_result = await yara.app.models.central.connector().post("/report/yara", central_input);
        } catch (err) {
          let out = `Central API down [ ${err.message} ]`;
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }
          throw new Error(out);
        }

        await yara.app.models.central.lastSeen(true, "yara");

        hell.o("going to save", "checkRoutine", "info");
        await yara.saveContents(central_result.data);

        hell.o("done", "checkRoutine", "info");
        yara.yara_routine_active = false;
        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "checkRoutine", "error");
        await yara.app.models.central.lastSeen(null, "yara", false);
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
   * SAVE CENTRAL YARA
   *
   * @param input
   * @returns {Promise<boolean>}
   */
  yara.saveContents = async function (input) {
    hell.o("start", "saveContents", "info");

    try {

      //to remove unused in the end of the check
      let current_list = await yara.find();
      let current_yara_list = []
      for (let feed of current_list) {
        hell.o("database feed", "saveContents", "info");
        hell.o(feed, "saveContents", "info");
        current_yara_list.push(feed.name);
      }

      let settings = await yara.app.models.settings.findOne();

      let current, output, content_path, changes_detected = false;
      for (let feed of input) {
        hell.o("feed from central", "saveContents", "info");
        hell.o(feed, "saveContents", "info");

        current = await yara.findOne({where: {name: feed.name}});
        if (!current || current.enabled !== feed.enabled) {
          hell.o("feed not found, new", "saveContents", "info");
          changes_detected = true;
        }

        if (current_yara_list.length > 0 && current !== undefined && current !== null) {
          hell.o("current_yara_list", "saveContents", "info");
          hell.o(current_yara_list, "saveContents", "info");
          hell.o("current", "saveContents", "info");
          hell.o(current, "saveContents", "info");
          current_yara_list = current_yara_list.filter(function (value, index, arr) {
            return value !== current.name;
          });
        }

        content_path = settings[`path_moloch_${feed.type}`];
        output = {
          folder: content_path + feed.name + "/",
          local_path: `${content_path}/${feed.name}/${feed.filename}`
        };

        hell.o([feed.name, "check folders"], "saveContents", "info");
        await yara.app.models.contentman.pathCheck(output.local_path);

        if (current !== null && current !== undefined && current.checksum === feed.checksum) {
          hell.o([feed.name, "checksums are the same"], "saveContents", "info");
        } else {
          hell.o([feed.name, "write content"], "saveContents", "info");
          await fs.writeFile(output.local_path, feed.contents);
          changes_detected = true;
        }

        delete feed.contents;
        feed.location = output.folder;
        if (!current) {
          hell.o([feed.name, "create db entry"], "saveContents", "info");
          await yara.create(feed);
        } else {
          hell.o([feed.name, "update db entry"], "saveContents", "info");
          await yara.update({name: feed.name}, feed);
        }

      }

      // console.log("CURRENT yara LIST");
      // console.log(current_yara_list);
      if (current_yara_list.length > 0) {
        for (let old_feed of current_yara_list) {
          if (!old_feed.enabled) continue;
          hell.o(["turning off old feed", old_feed], "saveContents", "info");
          await yara.update({name: old_feed}, {enabled: false});
          changes_detected = true;
        }
      }

      if (changes_detected) {
        hell.o("changes detected, apply new conf", "saveContents", "info");
        await yara.generateAndApply();
        await yara.app.models.central.lastSeen(null, "yara", true);
      } else
      {
        hell.o("no changes", "saveContents", "info");
      }

      hell.o("done", "saveContents", "info");
      return true;
    } catch (err) {
      hell.o(err, "saveContents", "error");
      return false;
    }

  };


  /**
   * GENERATE AND APPLY
   *
   * create new yara.ini
   * reload arkime
   *
   */
  yara.generateAndApply = async function () {
    hell.o("start", "generateAndApply", "info");

    try {

      let feeds = await yara.find({where: {enabled: true}});

      let yara_ini = "";
      for (let feed of feeds) {
        // console.log(feed);
        yara_ini = yara_ini + 'include "' + feed.location + feed.filename + '"\n';
      }

      // console.log("yara_ini", yara_ini);

      let settings = await yara.app.models.settings.findOne();

      hell.o("save new ini file", "generateAndApply", "info");
      await fs.writeFile(settings["path_moloch_yara_ini"], yara_ini);

      hell.o("restart arkime to reload rules file", "generateAndApply", "info");
      let salt_result = await yara.app.models.component.stateApply("arkime", "restart");
      hell.o(["salt result", salt_result], "generateAndApply", "info");
      if (!salt_result || salt_result.exit_code != 0) throw new Error("component_restart_failed");

      hell.o("done", "generateAndApply", "info");

      return true;
    } catch (err) {
      hell.o(err, "generateAndApply", "error");
      return false;
    }

  };

};
