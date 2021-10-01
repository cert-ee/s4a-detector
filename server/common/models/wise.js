'use strict';
const fs = require("fs").promises;
// const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "wise"});

module.exports = function (wise) {

  /**
   * INITIALIZE WISE
   *
   * create defaults
   */
  wise.initialize = async function () {
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

        let moloch = await wise.app.models.component.findOne({where: {name: 'moloch'}});
        if (!moloch.configuration.wise_enabled || !moloch.enabled) {
          hell.o("wise disabled, done", "checkRoutine", "info");
          cb(null, {message: "disabled"});
          return true;
        }

        let current_list = await wise.find({where: {enabled: true}});
        let central_input = {feeds: current_list}, central_result;
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

        await wise.app.models.central.lastSeen(true, "wise");
        // await wise.app.models.central.lastSeen(null, "wise", true);

        hell.o("going to save", "checkRoutine", "info");
        await wise.saveContents(central_result.data);

        hell.o("done", "checkRoutine", "info");
        wise.wise_routine_active = false;
        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "checkRoutine", "error");
        await wise.app.models.central.lastSeen(null, "wise", false);
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


  /**
   * SAVE CENTRAL WISE
   *
   * @param input
   * @returns {Promise<boolean>}
   */
  wise.saveContents = async function (input) {
    hell.o("start", "saveContents", "info");

    try {

      //to remove unused in the end of the check
      let current_list = await wise.find();
      let current_wise_list = [];
      for (let feed of current_list) {
        hell.o("database feed", "saveContents", "info");
        hell.o(feed, "saveContents", "info");
        current_wise_list.push(feed.name);
      }

      let settings = await wise.app.models.settings.findOne();

      let changes_detected = false;
      for (let feed of input) {
        hell.o("feed from central", "saveContents", "info");
        hell.o(feed, "saveContents", "info");

        let current = await wise.findOne({where: {name: feed.name}});
        if (!current || current.enabled !== feed.enabled) {
          hell.o("feed not found, new", "saveContents", "info");
          changes_detected = true;
        }

        if (current && current_wise_list.length > 0) {
          hell.o("current_wise_list", "saveContents", "info");
          hell.o(current_wise_list, "saveContents", "info");
          hell.o("current", "saveContents", "info");
          hell.o(current, "saveContents", "info");
          current_wise_list = current_wise_list.filter((value, index, arr) => value !== feed.name);
        }

        let content_path = settings["path_moloch_" + feed.type];
        let output = {
          folder: content_path + feed.name + "/",
          local_path: content_path + "/" + feed.name + "/" + feed.filename
        };

        hell.o([feed.name, "check folders"], "saveContents", "info");
        await wise.app.models.contentman.pathCheck(output.local_path);

        if (current && current.checksum === feed.checksum) {
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
          await wise.create(feed);
        } else {
          hell.o([feed.name, "update db entry"], "saveContents", "info");
          await wise.update({name: feed.name}, feed);

          if (current && ['location', 'filename'].some(field => current[field] !== feed[field])) {
            // remove old file
            let filename = current.location + current.filename;
            hell.o(['removing old file', filename], 'saveContents', 'info');
            try {
              await fs.unlink(filename);
            } catch(e) {
              hell.o(`failed to remove ${filename}: ${e}`, 'saveContents', 'info');
            };
          };

        }

      }

      // console.log("CURRENT WISE LIST");
      // console.log(current_wise_list);
      if (current_wise_list.length > 0) {
        for (let old_feed of current_wise_list) {
          let old_feed_entry = await wise.findOne({where: {name: old_feed}});
          if (!old_feed_entry || !old_feed_entry.enabled) continue; // null coalescing would be nice here
          hell.o(["turning off old feed", old_feed], "saveContents", "info");
          await wise.update({name: old_feed}, {enabled: false});
          changes_detected = true;
        }
      }

      if (changes_detected) {
        hell.o("changes detected, apply new conf", "saveContents", "info");
        await wise.generateAndApply();
        await wise.app.models.central.lastSeen(null, "wise", true);
      } else
      {
        hell.o("no changes", "saveContents", "info");
      }

      hell.o("done", "saveContents", "info");
      return true;
    } catch (err) {
      hell.o(err, "saveContents", "error");
      // await report.app.models.central.lastSeen(false);
      return false;
    }

  };


  /**
   * GENERATE AND APPLY
   *
   * create new wise.ini
   * reload moloch
   *
   */
  wise.generateAndApply = async function () {
    hell.o("start", "generateAndApply", "info");

    try {

      let feeds = await wise.find({where: {enabled: true}});

      let wise_ini = "";
      for (let feed of feeds) {
        console.log(feed);

        wise_ini += [
          `[file:${feed.name}]`,
          `file=${feed.location + feed.filename}`,
          `tags=${feed.tag_name}`,
          `type=${feed.type.replace("wise_", "")}`,
          'format=tagger',
          '',
          '',
        ].join('\n');

      }

      // console.log("wise_ini", wise_ini);

      let settings = await wise.app.models.settings.findOne();

      hell.o("save new ini file", "generateAndApply", "info");
      await fs.writeFile(settings["path_moloch_wise_ini"], wise_ini);

      hell.o("restart moloch to reload rules file", "generateAndApply", "info");
      let salt_result = await wise.app.models.component.stateApply("molochwise", "restart");
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
