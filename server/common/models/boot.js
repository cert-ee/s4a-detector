'use strict';
const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "boot"});

module.exports = function (boot) {

  /**
   * INITIALIZE BOOT
   *
   * create defaults
   */
  boot.tasks = {
    rules_full_sync: false
  };
  boot.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

      //this also builds indexes
      let check_for_data_models_changes = await boot.app.dataSources.db.autoupdate();

      hell.o("connect to mongo to check indexes", "initialize", "info");
      let index_result = await boot.app.dataSources.db.connector.connect(function (err, db) {
        if (err) throw new Error("could not connect to mongo");
        let collection;
        collection = db.collection('tagrule');
        collection.createIndex({"ruleId": 1});

        collection = db.collection('tagruleset');
        collection.createIndex({"rulesetId": 1});
        collection.createIndex({"tagId": 1});

        hell.o("index check done", "initialize", "info");
      });

      let versions_load = util.promisify(boot.app.models.system_info.version);
      let versions = await versions_load();
      let installer_version = parseInt(versions.main.replace(/[^0-9]/g, ''));
      hell.o(["this product package version: ", installer_version], "boot", "info");

      hell.o("find", "boot", "info");
      let system_info_result = await boot.app.models.system_info.findOne({name: "update_version"});
      if (!system_info_result) {
        hell.o("not found", "boot", "info");
        hell.o(system_info_result, "boot", "info");

        system_info_result = await boot.app.models.system_info.create(
          {name: "update_version", friendly_name: "App version", description: "", data: installer_version}
        );
        system_info_result = await boot.app.models.system_info.findOne({where: {name: "update_version"}});
      }

      let database_installer_version = system_info_result.data;

      hell.o([database_installer_version, installer_version], "boot", "info");

      if (database_installer_version === undefined || database_installer_version < installer_version) {
        hell.o("start updates check", "boot", "info");
        hell.o(["package json", installer_version], "boot", "info");
        hell.o(["system_info.update_version", database_installer_version], "boot", "info");

        let something_to_update = false;
        if (database_installer_version <= 178) {
          something_to_update = true;
          hell.o("need to destroy old feeds n settings", "boot", "info");
          await boot.app.models.yara.destroyAll();
          await boot.app.models.wise.destroyAll();
          await boot.app.models.system_info.destroyAll();
          await boot.app.models.system_info.create(
            {name: "update_version", friendly_name: "App version", description: "", data: installer_version}
          );

          hell.o("add default moloch configuration", "boot", "info");
          await boot.app.models.component.update({name: 'moloch'}, {
            configuration:
              {
                yara_enabled: false,
                wise_enabled: false,
                exclude_ips: []
              }
          });
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2158) {
          something_to_update = true;
          hell.o("remove current notify entries", "boot", "info");
          await boot.app.models.notify.destroyAll();

          hell.o("add default moloch configuration", "boot", "info");
          await boot.app.models.component.update({name: 'moloch'}, {
            configuration:
              {
                yara_enabled: false,
                wise_enabled: false,
                exclude_ips: []
              }
          });
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2174) {
          something_to_update = true;
          hell.o("update elastic param", "boot", "info");
          let elastic_comp = await boot.app.models.component.findOne({where: {name: "elastic"}});
          await boot.app.models.component.update({name: "elastic"}, {installed: true});

          hell.o("need to remove old yara and wise", "boot", "info");
          await boot.app.models.wise.destroyAll();
          await boot.app.models.yara.destroyAll();

          hell.o("need to update settings", "boot", "info");
          let current_settings = await boot.app.models.settings.findOne();
          const PATH_BASE = process.env.PATH_BASE;
          if (!PATH_BASE) throw new Error("env missing: PATH_BASE");

          let update_paths = {
            path_content_base: PATH_BASE,
            path_suricata_content: PATH_BASE + "suricata/",
            path_moloch_content: PATH_BASE + "moloch/",
            path_moloch_yara: PATH_BASE + "moloch/yara/",
            path_moloch_yara_ini: PATH_BASE + "moloch/yara.ini",
            path_moloch_wise_ini: PATH_BASE + "moloch/wise.ini",
            path_moloch_wise_ip: PATH_BASE + "moloch/wise_ip/",
            path_moloch_wise_ja3: PATH_BASE + "moloch/wise_ja3/",
            path_moloch_wise_url: PATH_BASE + "moloch/wise_url/",
            path_moloch_wise_domain: PATH_BASE + "moloch/wise_domain/"
          };

          await boot.app.models.settings.update({id: current_settings.id}, update_paths);

          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2200) {
          something_to_update = true;
          hell.o("update elastic param", "boot", "info");
          await boot.app.models.component.update({name: "elastic"}, {installed: true});
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2209) {
          something_to_update = true;
          hell.o("update components check time", "boot", "info");
          let cur_settings = await boot.app.models.settings.findOne();
          await boot.app.models.settings.update({id: cur_settings.id}, {job_interval_components_check: 5});
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2212) {

          let all_components = await boot.app.models.component.find();
          for (let compo of all_components) {
            hell.o([compo.name, "reset components version fields"], "boot", "info");
            let compo_update = {
              version_status: true,
              version_installed: "",
              version_available: ""
            };
            await boot.app.models.component.update({name: compo.name}, compo_update);
          }
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2214) {
          something_to_update = true;
          hell.o("update elastic enabled param", "boot", "info");
          await boot.app.models.component.update({name: "elastic"}, {enabled: true});
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2214) {
          something_to_update = true;
          hell.o("update elastic enabled param", "boot", "info");
          await boot.app.models.component.update({name: "elastic"}, {enabled: true});
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2252) {
          something_to_update = true;
          hell.o("update autoupgrade enabled param", "boot", "info");
          await boot.app.models.component.update({name: "autoupgrade"}, {enabled: true, installed: true});
          hell.o("---", "boot", "info");
        }

        if (database_installer_version <= 2281) {
          something_to_update = true;
          hell.o("update ruleset model with skip_review and force_disabled", "boot", "info");
          let rulesets = await boot.app.models.ruleset.find();
          for (const rs of rulesets) {
            await boot.app.models.ruleset.update({name: rs.name}, {
              skip_review: rs.automatically_enable_new_rules,
              force_disabled: false
            });
          }
          hell.o("do some defaulting for rules");
          let rules = await boot.app.models.rule.find(), temp_rule;
          for (const r of rules) {

            temp_rule = {
              sid: r.sid,
              revision: r.revision,
              classtype: r.classtype,
              severity: r.severity,
              ruleset: r.ruleset,
              enabled: r.enabled,
              message: r.message,
              rule_data: r.rule_data,
              force_disabled: r.force_disabled || false,
              feed_name: false,
              primary: false
            };

            await boot.app.models.rule.update({id: r.id}, temp_rule);
          }
          hell.o("---", "boot", "info");
        }

        if (!something_to_update) {
          hell.o("currently no updates", "boot", "info");
        }

      }
      hell.o(["save update / patch level", installer_version], "boot", "info");
      await boot.app.models.system_info.update({name: "update_version"}, {data: installer_version});

      hell.o("done", "initialize", "info");

      return true;
    } catch (err) {
      hell.o(err, "initialize", "err");
      return false;
    }

  };

};
