'use strict';
const util = require('util');
const hell = new (require(__dirname + "/helper.js"))({module_name: "boot"});

module.exports = function (boot) {

  /**
   * INITIALIZE BOOT
   *
   * create defaults
   */
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
      let server_numbers = parseInt(versions.server.replace(/[^0-9]/g, ''));
      hell.o(["this product server version: ", server_numbers], "boot", "info");

      hell.o("find", "boot", "info");
      let system_info_result = await boot.app.models.system_info.findOne({name: "update_version"});
      if (!system_info_result) {
        hell.o("not found", "boot", "info");
        hell.o(system_info_result, "boot", "info");

        system_info_result = await boot.app.models.system_info.create(
          {name: "update_version", friendly_name: "App version", description: "", data: server_numbers}
        );
        system_info_result = await boot.app.models.system_info.findOne({where: {name: "update_version"}});
      }

      hell.o([system_info_result.data, server_numbers], "boot", "info");

      if (system_info_result.data === undefined || system_info_result.data < server_numbers) {
        hell.o("start updates check", "boot", "info");
        hell.o(["package json", server_numbers], "boot", "info");
        hell.o(["system_info.update_version", system_info_result.data], "boot", "info");

        let something_to_update = false;
        if (server_numbers <= 178) {
          something_to_update = true;
          hell.o("need to destroy old feeds n settings", "boot", "info");
          await boot.app.models.yara.destroyAll();
          await boot.app.models.wise.destroyAll();
          await boot.app.models.system_info.destroyAll();
          await boot.app.models.system_info.create(
            {name: "update_version", friendly_name: "App version", description: "", data: server_numbers}
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

        }

        if (server_numbers <= 2158) {
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
        }

        if (server_numbers <= 2174) {
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
            path_moloch_wise_url: PATH_BASE + "moloch/wise_url/",
            path_moloch_wise_domain: PATH_BASE + "moloch/wise_domain/"
          };

          await boot.app.models.settings.update({id: current_settings.id}, update_paths);

        }

        if (server_numbers <= 2200) {
          something_to_update = true;
          hell.o("update elastic param", "boot", "info");
          let elastic_comp = await boot.app.models.component.findOne({where: {name: "elastic"}});
          await boot.app.models.component.update({name: "elastic"}, {installed: true});
        }

        if (!something_to_update) {
          hell.o("currently no updates", "boot", "info");
        }

      }
      hell.o(["save update / patch level", server_numbers], "boot", "info");
      await boot.app.models.system_info.update({name: "update_version"}, {data: server_numbers});

      hell.o("done", "initialize", "info");

      return true;
    } catch (err) {
      hell.o(err, "initialize", "err");
      return false;
    }

  };

};
