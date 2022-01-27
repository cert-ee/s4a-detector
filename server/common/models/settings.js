'use strict';
const fs = require('fs');
const shelljs = require('shelljs');
const hell = new (require(__dirname + "/helper.js"))({module_name: "settings"});

module.exports = function (settings) {

  /**
   * UPDATE SETTING
   *
   * auto_upgrade needs to run salt state
   *
   * @param name
   * @param value
   * @param options
   * @param cb
   * @returns {Promise}
   */
  settings.updateSetting = function (name, value, options, httpReq, cb) {
    hell.o(["update setting", "start name: " + name + " value: " + value], "updateSetting", "info");

    if (httpReq !== undefined) {
      // console.log( httpReq );
      hell.o("apply no timeout to http call", "updateSetting", "info");
      httpReq.setTimeout(0);
    }

    (async function () {
      try {
        let sett = await settings.findOne({where: {id: "settingid"}});
        if (!sett) throw new Error("load_failed");

        let setts = Object.keys(sett.toJSON());
        delete setts.id;

        //hell.o(["current", setts], "updateSetting", "info");

        if (!setts.includes(name)) throw new Error("illegal setting: " + name);
        if (sett[name] == value) return cb({name: "Error", status: 400, message: "no_changes"});

        /*
        Update
         */
        let update_input = {};
        update_input[name] = value;
        // console.log( "update_input" );
        // console.log( update_input);

        let update_result;

        if (name == "auto_upgrade") {

          hell.o("auto_upgrade", "updateSetting", "info");

          let state = "enabled";
          if (!value) {
            state = "disabled";
          }

          hell.o([name + " run salt state:", state], "updateSetting", "info");

          let salt_result = await settings.app.models.component.stateApply("autoupgrade", state);
          if (!salt_result) throw new Error("salt_failed");

        }

        hell.o([name, " update database"], "updateSetting", "info");
        update_result = await settings.update({id: "settingid"}, update_input);
        if (!update_result) throw new Error("save_failed");

        if (name.startsWith("smtp")) {
          hell.o("nodemailer needs to be recreated", "updateSetting", "info");
          await settings.app.models.notify.initializeMailer();
        }

        /*
        Reload settings
         */
        await settings.initialize(function () {
          hell.o([name, "done"], "updateSetting", "info");
          cb(null, {message: "ok"});
        });

      } catch (err) {
        hell.o(err, "updateSetting", "error");
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  settings.remoteMethod('updateSetting', {
    accepts: [
      {arg: 'name', type: 'string', required: true},
      {arg: 'value', type: 'any', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"},
      {arg: "req", type: "object", http: {source: "req"}}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/updateSetting', verb: 'post', status: 200}
  });

  /**
   * LOAD SETTINGS TO VAR
   *
   * @param input
   * @param cb
   */
  // settings.initialize = function (cb) {
  //   hell.o("start", "initialize", "info");
  //
  //   (async () => {
  //     try {
  //
  //       hell.o("query", "initialize", "info");
  //       let settings_result = await settings.findOne({id: "settingid"});
  //       if (!settings_result) {
  //         await settings.create({id: "settingid"});
  //         settings_result = await settings.findOne({id: "settingid"});
  //       }
  //       settings_result.toJSON();
  //
  //       let setts = Object.keys(settings_result);
  //       for (let i = 0, l = setts.length; i < l; i++) {
  //         if (setts[i] == "id") continue;
  //         hell.o([setts[i], settings_result[setts[i]]], "initialize", "info");
  //         settings[setts[i]] = settings_result[setts[i]];
  //       }
  //
  //       hell.o("done", "initialize", "info");
  //       cb(null, true);
  //
  //     } catch (err) {
  //       hell.o(err, "initialize", "err");
  //       cb(err);
  //     }
  //
  //   })(); // async
  //
  // };


  /**
   * INITIALIZE SETTINGS
   *
   * create defaults
   */
  settings.initialize = async function () {
    hell.o("start", "initialize", "info");

    try {

      // create settings with defaults
      let current_settings = await settings.findOrCreate({});
      if (!current_settings) throw new Error("FAILED TO LOAD SETTINGS");
      // console.log( "current_settings" );
      // console.log( current_settings );

      let found_settings = current_settings[0];
      // console.log( found_settings );

      const PATH_BASE = process.env.PATH_BASE;

      if (!PATH_BASE) throw new Error("env missing: PATH_BASE");

      let exists = await fs.existsSync(PATH_BASE);
      if (!exists) {
        throw new Error("path does not exist: " + PATH_BASE);
      }

      if (found_settings.path_content_base !== PATH_BASE) {
        hell.o(["going to update path_content_base from env", found_settings.path_content_base, PATH_BASE], "initialize", "info");

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

        await settings.update({id: found_settings.id}, update_paths);

      }

      hell.o("done", "initialize", "info");
      return true;
    } catch (err) {
      hell.o(err, "initialize", "err");
      return false;
    }

  };


  /**
   * AFTER SAVING A SETTING RELOAD SOME MODELS
   *
   */
  settings.observe('after save', async (ctx) => {
    if (ctx.isNewInstance === undefined) return Promise.resolve();
    hell.o(["start", ctx.instance.id], "afterSave", "info");

    try {

      // console.log("CTX: ");
      // console.log(ctx.instance);
      // let current_settings = await settings.findOne({where: {id: ctx.instance.id}});

      //RECREATE MAILER
      hell.o(["start", "notify.initializeMailer"], "afterSave", "info");
      await settings.app.models.notify.initializeMailer();

      hell.o(["done", ctx.instance.id], "afterSave", "info");
      return Promise.resolve();
    } catch (err) {
      hell.o(err, "afterSave", "error");

      return Promise.resolve();
    }

  });

  /**
   * RETURN PATHS FOR SALT
   *
   * @param options
   * @param cb
   */

  settings.paths = function (options, cb) {
    hell.o("start", "paths", "info");

    (async function () {
      try {
        let result = await settings.findOne();
        if (!result || result.length == 0) throw new Error("no_data_found");

        let output = {
          path_content_base: result.path_content_base,
          path_suricata_content: result.path_suricata_content,
          path_moloch_content: result.path_moloch_content,
          path_moloch_yara: result.path_moloch_yara,
          path_moloch_yara_ini: result.path_moloch_yara_ini,
          path_moloch_wise_ini: result.path_moloch_wise_ini,
          path_moloch_wise_ip: result.path_moloch_wise_ip,
          path_moloch_wise_ja3: result.path_moloch_wise_ja3,
          path_moloch_wise_url: result.path_moloch_wise_url,
          path_moloch_wise_domain: result.path_moloch_wise_domain
        };

        cb(null, output);
        return true;
      } catch (err) {
        hell.o(err, "paths", "error");
        cb({name: "Error", status: 400, message: err});
        return false;
      }
    })(); // async

  };

  settings.remoteMethod('paths', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/paths', verb: 'get', status: 200}
  });

  /**
   * RESET FUNCTION
   *
   * for development
   *
   * @param options
   * @param cb
   */
  settings.resetApp = async function (options, cb) {
    hell.o("start", "resetApp", "warn");

    if (process.env.NODE_ENV !== "dev") {
      hell.o("ENV is not DEV, fail", "resetApp", "warn");
      cb("error");
      return false;
    }

    try {

      hell.o("destroy database", "resetApp", "warn");


      await settings.app.models.central.destroyAll();
      await settings.app.models.registration.destroyAll();
      await settings.app.models.component.destroyAll();
      await settings.app.models.network_interfaces.destroyAll();
      await settings.app.models.rule.destroyAll();
      await settings.app.models.rule_draft.destroyAll();
      await settings.app.models.ruleset.destroyAll();
      await settings.app.models.log.destroyAll();
      await settings.app.models.role.destroyAll();
      await settings.app.models.roleMapping.destroyAll();
      await settings.app.models.User.destroyAll();
      await settings.destroyAll();

      // await settings.app.models.roleMapping.destroyAll();


      let output = {message: "reset done"};

      cb(null, output);

      hell.o("restart proccess", "resetApp", "warn");
      if (process.env.NODE_ENV == "dev") {
        hell.o("restart nodemon", "resetApp", "warn");
        shelljs.touch("server.js"); // kick nodemon
      } else {
        hell.o("pm2 restart", "resetApp", "warn");
        //process.exit(1); //pm2
      }

    } catch (err) {
      hell.o(err, "resetApp", "error");
      cb({name: "Error", status: 400, message: err.message});
    }

  };

  settings.remoteMethod('resetApp', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/resetApp', verb: 'get', status: 200}
  });

};
