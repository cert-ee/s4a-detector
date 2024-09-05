'use strict';
const fs = require("fs");
const hell = new (require(__dirname + "/helper.js"))({module_name: "rule"});

module.exports = function (rule) {

  const rules_file_path = process.env.PATH_SURICATA_RULES_OUT; //"/etc/suricata/rules/all.rules";

  /**
   * CHECK NEW RULES FROM CENTRAL
   *
   * @param cb
   */
  rule.rules_routine_active = false;
  rule.checkRoutine = async function (params) {
    hell.o("start", "checkRoutine", "info");
    if (params !== undefined) {
      hell.o(params, "checkRoutine", "info");
    }

    if (!rule.app.models.central.CENTRAL_ACTIVATED) {
      hell.o("central is not activated yet, return", "checkRoutine", "warn");
      return {name: "Error", status: 400, message: "not_approved"};
    }
    if (rule.rules_routine_active) {
      hell.o("is already running, busy", "checkRoutine", "warn");
      return {name: "Error", status: 400, message: "worker_busy"};
    }

    rule.rules_routine_active = true;

    try {
      let settings = await rule.app.models.settings.findOne();
      let central_info = await rule.app.models.central.findOne();

      //console.log(`last_update_rules from db: ${central_info.last_rules_update}` );
      //let central_input = {last_update: "TIMESTAMP"};
      let rules_test = await rule.find({limit: 10});

      let central_input = {last_rules_update: "full"};
      if (central_info.last_rules_update !== undefined && rules_test.length == 10 && (
        params === undefined || params === null || params.full_check !== true)) {

        central_input = {last_rules_update: central_info.last_rules_update};
      }

      //after boot always perform full sync
      if (!rule.app.models.boot.tasks.rules_full_sync) {
        rule.app.models.boot.tasks.rules_full_sync = true;
        central_input = {last_rules_update: "full"};
      }

      //central_input = {last_rules_update: "full"}; //initiate full sync on demand

      let central_result;
      try {
        hell.o(["central input ", central_input], "checkRoutine", "info");
        central_result = await rule.app.models.central.connector().post("/report/rules", central_input);
      } catch (err) {
        let out = `Central API down [ ${err.message} ]`;
        if (err.response && err.response.data
          && err.response.data.error && err.response.data.error.message) {
          out = err.response.data.error.message;
        }

        throw new Error(out);
      }

      // console.log( central_result.data.rules );

      let feeds_length = central_result.data.feeds.length;
      hell.o(["new feed count", feeds_length], "checkRoutine", "info");

      if (feeds_length === 0) {
        hell.o("no new feeds", "checkRoutine", "info");
        rule.app.models.central.lastSeen(null, "rules", true);
        rule.rules_routine_active = false;

        return {message: "ok"};
      }

      if (settings.auto_rules == false) {
        hell.o("new rules available, but automatic download disabled", "checkRoutine", "info");
        rule.app.models.central.update({id: "centralid"}, {rules_new_available: feeds_length});
        rule.app.models.central.lastSeen(null, "rules", true);
        rule.rules_routine_active = false;
        return {message: "ok"};
      }

      /**
       * LOOP NEW RULES
       */

      hell.o(["got feeds", central_result.data.feeds], 'checkRoutine', 'info');

      let feeds = await Promise.all(central_result.data.feeds
        .map(feed => feed.name.replace(/\//g, '_'))
        .map(feed_name => rule.app.models.feed.findOrCreate({where: {name: feed_name}}, {name: feed_name, location: settings.path_suricata_content, filename: `${feed_name}.tar.gz`}))
      );

      for (let [feed] of feeds) {
        hell.o(`fetching feed ${feed.name}`, 'checkRoutine', 'info');
        let response = await rule.app.models.central.connector().post("/report/feedFetch", {feed_name: feed.name, Accept: 'application/octet-stream'}, {responseType: 'arraybuffer'});
        let path = feed.location + feed.filename;
        let tmp_path = path + '.tmp';
        await rule.app.models.contentman.pathCheck(tmp_path);
        await fs.promises.writeFile(tmp_path, response.data);
        await fs.promises.rename(tmp_path, path);
        hell.o(`wrote feed file for ${feed.name}`, 'checkRoutine', 'info');
      };

      hell.o("fetching disable SIDs file", 'checkRoutine', 'info');
      let response = await rule.app.models.central.connector().post("/report/sidFetch", {Accept: 'application/octet-stream'}, {responseType: 'arraybuffer'});
      hell.o("fetched disable SIDs file", 'checkRoutine', 'info');
      let path = settings.path_suricata_content + 'disabled_rule_sids.txt';
      let tmp_path = path + '.tmp';
      await rule.app.models.contentman.pathCheck(tmp_path);
      await fs.promises.writeFile(tmp_path, response.data);
      await fs.promises.rename(tmp_path, path);

      /*await Promise.all(feeds.map(async ([feed]) => {
        hell.o(`fetching feed ${JSON.stringify(feed)}`, 'checkRoutine', 'info');
        let response = await rule.app.models.central.connector().post("/report/feedFetch", {feed_name: feed.name}, {responseType: 'arraybuffer'});
        let path = feed.location + feed.filename;
        await fs.promises.writeFile(path, response.data);
        hell.o(`wrote feed file for ${feed.name}`, 'checkRoutine', 'info');
      }));*/
      

      hell.o("done", "checkRoutine", "info");
      rule.app.models.central.lastSeen(null, "rules", true);
      rule.rules_routine_active = false;
      return {message: "ok"};
    } catch (err) {
      hell.o(err, "checkRoutine", "error");
      rule.app.models.central.lastSeen(null, "rules", false);
      rule.rules_routine_active = false;
      throw {name: "error", status: 400, message: err.message};
    }
  };

  rule.remoteMethod('checkRoutine', {
    accepts: [
      {arg: 'params', type: 'object', required: false},
    ],
    returns: {type: 'object', root: true},
    http: {path: '/checkRoutine', verb: 'get', status: 200}
  });

  //rewrite to taskers
  rule.checkRoutinePromise = function (params) {
    return new Promise((success, reject) => {
      rule.checkRoutine(params, function (err, result) {
        if (err) {
          reject(err);
        } else {
          success(result);
        }
      });
    });
  };

  /**
   * REMOVE RULES / job_schedule
   *
   * and reload suricata
   *
   * @param cb
   */
  rule.removeRules = async function (rules_to_remove, cb) {
    hell.o("start", "removeRules", "info");

    try {

      let found_rule;
      rules_to_remove = rules_to_remove.rules;
      for (let i = 0, l = rules_to_remove.length; i < l; i++) {
        console.log(rules_to_remove[i].sid);
        found_rule = await rule.findOne({where: {sid: rules_to_remove[i].sid}});
        if (found_rule) await rule.destroyById(found_rule.id);
        found_rule = await rule.app.models.rule_draft.findOne({where: {sid: rules_to_remove[i].sid}});
        if (found_rule) await rule.app.models.rule_draft.destroyById(found_rule.id);

      }

      // rule.checkRoutine({full_check: true});

      if (cb) cb(null, {message: "ok"});
      return true;
    } catch (err) {
      hell.o(err, "removeRules", "error");
      if (cb) cb({name: "Error", status: 400, message: err.message});
    }

  };


  /**
   * APPLY NEW RULES
   *
   * and reload suricata
   *
   * @param cb
   */
  rule.applyNewRules = function (cb) {
    hell.o("start", "applyNewRules", "info");

    (async function () {
      try {

        hell.o("query all enabled rules", "applyNewRules", "info");
        let rules = await rule.find({where: {enabled: true}, fields: ["rule_data"]});
        if (!rules) throw new Error("load_failed");

        hell.o("start write to file", "applyNewRules", "info");
        let file = fs.createWriteStream(rules_file_path);

        file.on('error', function (err) {
          hell.o(err, "applyNewRules", "error");
        });

        let current_rule;
        for (let i = 0, l = rules.length; i < l; i++) {
          current_rule = rules[i].rule_data;
          file.write(current_rule + '\n');
        }

        file.end();

        hell.o("end of rules write to file", "applyNewRules", "info");

        hell.o("reload suricata rules file", "applyNewRules", "info");
        let salt_result = await rule.app.models.component.stateApply("suricata", "reload");
        hell.o(["salt result", salt_result], "applyNewRules", "info");
        if (!salt_result || salt_result.exit_code != 0) throw new Error("component_restart_failed");

        hell.o("done", "applyNewRules", "info");

        if (cb) cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "applyNewRules", "error");
        if (cb) cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

};
