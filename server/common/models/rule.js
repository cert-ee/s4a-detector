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
  rule.checkRoutine = function (params, cb) {
    hell.o("start", "checkRoutine", "info");

    if (!rule.app.models.central.CENTRAL_ACTIVATED) {
      hell.o("central is not activated yet, return", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "not_approved"});
    }
    if (rule.rules_routine_active) {
      hell.o("is already running, busy", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }

    rule.rules_routine_active = true;

    (async function () {
      try {

        let settings = await rule.app.models.settings.findOne();
        let central_info = await rule.app.models.central.findOne();

        //console.log( "last_update_rules from db: " + central_info.last_rules_update );
        //let central_input = {last_update: "TIMESTAMP"};
        let rules_test = await rule.find({limit: 10});

        let central_input = {last_rules_update: "full"};
        if (central_info.last_rules_update !== undefined && rules_test.length == 10 && params !== undefined && params.full_check !== true) {
          central_input = {last_rules_update: central_info.last_rules_update};
        }

        //central_input = {last_rules_update: "full"}; //initiate full sync on demand

        let central_result;
        try {
          hell.o(["central input ", central_input], "checkRoutine", "info");
          central_result = await rule.app.models.central.connector().post("/report/rules", central_input);
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        // console.log( central_result.data.rules );

        let new_rule_count = central_result.data.rules.length;
        hell.o(["new rules count", new_rule_count], "checkRoutine", "info");

        if (new_rule_count == 0) {
          hell.o("no new rules", "checkRoutine", "info");
          rule.app.models.central.lastSeen(null, "rules", true);
          rule.rules_routine_active = false;
          cb(null, {message: "ok"});
          return;
        }

        if (settings.auto_rules == false) {
          hell.o("new rules available, but automatic download disabled", "checkRoutine", "info");
          rule.app.models.central.update({id: "centralid"}, {rules_new_available: new_rule_count});
          rule.app.models.central.lastSeen(null, "rules", true);
          rule.rules_routine_active = false;
          cb(null, {message: "ok"});
          return;
        }

        /**
         * LOOP NEW RULES
         */
        let current_rule, sid, enabled, revision, found, inserted, updated, rule_info, latest_change_central = false;
        for (let i = 0, l = new_rule_count; i < l; i++) {

          if (i % 500 === 0) { //just to show activity in the logs for full sync
            hell.o("looping new rules " + i + " / " + new_rule_count, "checkRoutine", "info");
          }

          rule_info = central_result.data.rules[i];
          sid = rule_info.sid;
          enabled = rule_info.enabled;
          revision = rule_info.revision;

          /*
          remember latest change time for next update polling
           */
          if (!latest_change_central) {
            latest_change_central = rule_info.modified_time;
          } else {
            if (rule_info.modified_time > latest_change_central) {
              latest_change_central = rule_info.modified_time;
            }
          }

          let update_input, update_result, tag_rule, ruleset, rs_tags, draft_input;
          let rule_found = await rule.findOne({where: {sid: sid}});

          //create ruleset if new
          [ruleset] = await rule.app.models.ruleset.findOrCreate(
            {where: {name: rule_info.ruleset}, include: ['tags']}, {name: rule_info.ruleset});
          rs_tags = ruleset.tags;
          if (rs_tags === undefined) rs_tags = [];
          //hell.o([current_rule.sid, "" + current_rule.ruleset ], "checkRoutine", "info");

          //create classtype if new
          if (rule_info.classtype !== "" || rule_info.classtype !== undefined) {
            let classtype_found = await rule.app.models.rule_classtype.findOrCreate(
              {where: {name: rule_info.classtype}}, {name: rule_info.classtype}
            );
          }

          /*
          NEW RULE, CREATE
           */
          if (!rule_found) {
            //hell.o([sid, "no rule found, create"], "checkRuleLine", "info");
            if (!ruleset.automatically_enable_new_rules) {
              rule_info.enabled = false;
            }

            let rule_create = await rule.create(rule_info);
            if (!rule_create) throw new Error("failed to create rule");

            //add tags if needed
            if (rs_tags.length > 0) {
              for (let i = 0, l = rs_tags.length; i < l; i++) {
                tag_rule = await rule_create.tags.add(rs_tags[i]);
                if (!tag_rule) throw new Error(sid + " failed to add new tag");
              }
            }

            //if automatically is disable for ruleset, but rule should be enabled, add to drafts
            if (!ruleset.automatically_enable_new_rules && enabled) {
              hell.o([sid, "create draft"], "checkRuleLine", "info");
              draft_input = [{id: rule_create.id, enabled: true}];
              rule.app.models.rule_draft.more(draft_input, null, function () {
                hell.o([sid, "draft created"], "checkRuleLine", "info");
              });
            }

            continue;
          }

          /*
          SAME REVISION, CHECK IF ENABLED IS STILL UNCHANGED
           */
          if (rule_found.revision == revision) { //if same revision, only enable/disable changes for now
            if (rule_found.enabled == enabled) {
              // hell.o([sid, "no changes"], "checkRuleLine", "info");
              continue;
            }
          }

          /*
          AUTOMATIC UPDATE ALLOWED FOR RULESET
           */
          if (ruleset.automatically_enable_new_rules) {
            hell.o([sid, "new revision update"], "checkRuleLine", "info");
            update_result = await rule.update({id: rule_found.id}, rule_info);
            if (!update_result) throw new Error(sid + " failed to update rule");
            hell.o([sid, "update ok"], "checkRuleLine", "info");
            continue;
          }

          /*
          AUTOMATIC UPDATES NOT ALLOWED FOR RULESET, DRAFT IT
           */
          if (rule_found.revision == revision && rule_found.enabled != enabled) {
            //toggle enabled
            hell.o([sid, "enable change " + enabled], "checkRuleLine", "info");
            draft_input = [{id: rule_found.id, enabled: enabled}];

          } else { //must new revision

            delete rule_info.modified_time;
            rule_info.id = rule_found.id;
            draft_input = [rule_info];
          }

          hell.o([sid, "create draft"], "checkRuleLine", "info");

          await rule.app.models.rule_draft.more(draft_input, null, function () {
            hell.o([sid, "draft created"], "checkRuleLine", "info");
            //return success(true);
          });

        } //for loop

        hell.o("loop done, go to apply new rules", "checkRoutine", "info");
        await rule.applyNewRules();

        let central_changes = {last_rules_update: latest_change_central, last_rules_check: new Date()};
        let change_last_update_time = await rule.app.models.central.update({id: "centralid"}, central_changes);
        hell.o(["latest change in central", latest_change_central], "checkRoutine", "info");
        hell.o(["New rules count: ", new_rule_count], "checkRoutine", "info");

        rule.app.models.central.lastSeen(null, "rules", true);

        hell.o("done", "checkRoutine", "info");
        rule.rules_routine_active = false;
        if (cb) cb(null, {message: "ok"});
        return true;
      } catch (err) {
        hell.o(err, "checkRoutine", "error");
        rule.app.models.central.lastSeen(null, "rules", false);
        rule.rules_routine_active = false;
        if (cb) cb({name: "error", status: 400, message: err.message});
        return false;
      }

    })(); // async

  };

  rule.remoteMethod('checkRoutine', {
    accepts: [],
    returns: {type: 'object', root: true},
    http: {path: '/checkRoutine', verb: 'get', status: 200}
  });

  // rule.checkRoutine();


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

      rule.checkRoutine({full_check: true});

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

        hell.o("restart suricata to reload rules file", "applyNewRules", "info");
        let salt_result = await rule.app.models.component.stateApply("suricata", "restart");
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
