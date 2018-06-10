'use strict';

const axios = require('axios');
const shelljs = require('shelljs');
const sslutils = require('ssl-utils');
const util = require('util');
const fs = require('fs');
const hell = new (require(__dirname + "/helper.js"))({module_name: "component"});

module.exports = function (component) {

  const input = [
    {
      name: "autoupgrade",
      friendly_name: "Auto upgrade",
      message: "",
      network_interface_changes: false,
      web_url: false,
      install_order: 1,
      preset: true,
      after_approval: false,
      installed: false,
      installable: false,
      enabled: false,
      toggleable: false,
      restartable: false,
      status: false
    },
    {
      name: "nginx",
      friendly_name: "Nginx",
      message: "Already installed",
      network_interface_changes: false,
      web_url: false,
      preset: true,
      after_approval: false,
      installed: true,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: false,
      status: false,
      configuration:
        {
          ssl_enabled: false,
          ssl_cert: "",
          ssl_chain: "",
          ssl_key: ""
        }
    },
    {
      name: "elastic",
      friendly_name: "Elasticsearch",
      message: "",
      network_interface_changes: false,
      web_url: false,
      health_url: "http://localhost:9200/_cluster/health",
      install_order: 2,
      preset: true,
      after_approval: false,
      installed: false,
      installable: false,
      enabled: false,
      toggleable: false,
      restartable: true,
      status: false
    },
    {
      name: "suricata",
      friendly_name: "Suricata",
      message: "",
      network_interface_changes: true,
      web_url: false,
      install_order: 3,
      preset: true,
      after_approval: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: false
    },
    {
      name: "evebox",
      friendly_name: "Evebox",
      message: "",
      network_interface_changes: false,
      web_url: "evebox/",
      health_url: "http://localhost:5636/api/1/version",
      install_order: 4,
      preset: true,
      after_approval: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: false,
      restartable: true,
      status: false
    },
    {
      name: "evebox-agent",
      friendly_name: "Evebox Agent",
      message: "Will be installed with evebox",
      network_interface_changes: false,
      web_url: false,
      preset: true,
      after_approval: false,
      installed: true,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: true,
      status: false
    },
    {
      name: "netdata",
      friendly_name: "Netdata",
      message: "",
      network_interface_changes: false,
      web_url: "netdata/",
      health_url: "http://localhost:19999/api/v1/chart/?chart=netdata.response_time",
      preset: true,
      after_approval: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: false
    },
    {
      name: "moloch",
      friendly_name: "Moloch",
      message: "",
      network_interface_changes: true,
      web_url: "moloch/",
      health_url: "http://localhost:8005/eshealth.json",
      preset: false,
      after_approval: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: false,
      restartable: true,
      status: false
    },
    {
      name: "nfsen",
      friendly_name: "NFsen",
      message: "",
      network_interface_changes: true,
      web_url: "nfsen/",
      preset: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: true,
      configuration:
        {
          sampling_rate: -1000
        }
    },
    {
      name: "telegraf",
      friendly_name: "Telegraf",
      message: "Will be automatically installed after registration process",
      network_interface_changes: false,
      web_url: false,
      preset: false,
      after_approval: true,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: false
    },
    {
      name: "vpn",
      friendly_name: "OpenVPN",
      message: "",
      network_interface_changes: false,
      web_url: false,
      preset: true,
      after_approval: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: true
    }
  ];

  /**
   * INITIALIZE
   *
   * ready http and create db entries if missing components
   */
  component.initialize = function (cb) {
    hell.o("start", "initialize", "info");
    component.local_connection = axios.create({});
    hell.o("local axios created", "initialize", "info");

    (async () => {
      try {
        let component_result, update_component;
        for (const comp of input) {
          component_result = await component.findOrCreate({where: {name: comp.name}}, comp);
          if (!component_result) throw new Error("failed to create component " + comp.name);

          // lets call this part "update script", if new version has extra details"
          for ( let params in comp ){
            if( comp.hasOwnProperty(params) && component_result[0][params] === undefined ){
              update_component = {};
              update_component[params] = comp[params];
              console.log( update_component );
              hell.o(["update component: " + comp.name +" defaults: " + params, comp[params]], "initialize", "info");
              await component.update({name: comp.name}, update_component );
            }
          }

        }

        hell.o("done", "initialize", "info");
        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "initialize", "error");
        component.components_routine_active = false;
        cb({name: "Error", status: 400, message: err});
      }

    })(); //async

  };

  /**
   * CHECK SSL STRINGS
   *
   * @param ssl_cert
   * @param ssl_chain
   * @param ssl_key
   * @param options
   * @returns {Promise}
   */
  component.sslCheck = function( ssl_cert, ssl_chain, ssl_key, cb ){
    hell.o("start", "sslCheck", "info");
    return new Promise((success, reject) => {

       (async function () {
        try {

          // hell.o([ "ssl_cert", ssl_cert ], "sslCheck", "info");
          // hell.o([ "ssl_chain", ssl_chain ], "sslCheck", "info");
          // hell.o([ "ssl_key", ssl_key ], "sslCheck", "info");

          let ca_file_path_in_tmp = "/tmp/chain_for_ssl_check";
          let ssl_options = { "CAfile" : ca_file_path_in_tmp };
          let result ;

          let write_tmp_ca = new Promise((resolve, reject) => {
            fs.writeFile(ca_file_path_in_tmp, ssl_chain, (err) => {
              if (err) {
                hell.o("CAfile write to temp folder FAILED", "sslCheck", "error");
                return reject(err);
              }
              hell.o("CAfile write to temp folder OK", "sslCheck", "info");
              resolve(true);
            });
          });

          hell.o("CAfile write to temp folder", "sslCheck", "info");
          result = await write_tmp_ca;

          hell.o("verify certificate and CA", "sslCheck", "info");
          let verifyCertificate = util.promisify( sslutils.verifyCertificate );
          result = await verifyCertificate( ssl_cert, ssl_options  );
          if( result.valid !== true || result.verifiedCA !== true ){
            throw new Error( "Certificate not valid: " + result.output );
          }

          hell.o("verify key", "sslCheck", "info");
          let verifyKey = util.promisify( sslutils.verifyKey );
          await verifyKey( ssl_key );

          hell.o("compare moduli", "sslCheck", "info");
          let compareModuli = util.promisify( sslutils.compareModuli );
          await compareModuli( ssl_cert, ssl_key );

          hell.o("check expiration", "sslCheck", "info");
          let checkCertificateExpiration = util.promisify( sslutils.checkCertificateExpiration );
          result = await checkCertificateExpiration( ssl_cert );

          let remaining_time = result.getTime() - Date.now();
          let one_day = 24*60*60*1000;
          let remaining_days = Math.round( remaining_time / one_day );

          let output_message = "SSL expires after days: " + remaining_days;
          if( remaining_days <= 15 ) {
            throw new Error( output_message );
          }

          hell.o([ "ssl ok ", output_message ], "sslCheck", "info");

          if (cb) return cb(null, output_message );
          return success( output_message );

        } catch (err) {
          hell.o(err, "sslCheck", "error");
          if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
          return reject(err);
        }

    })(); //async

  }); //promise

  };

  component.remoteMethod('sslCheck', {
    accepts: [
      {arg: "ssl_cert", type: "string", required: true},
      {arg: "ssl_chain", type: "string", required: true},
      {arg: "ssl_key", type: "string", required: true},
      //{arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/sslCheck', verb: 'post', status: 200}
  });

  /**
   * DISABLE SSL
   *
   * remove config and restart nginx
   *
   * @param ssl_cert
   * @param ssl_chain
   * @param ssl_key
   * @param options
   * @returns {Promise}
   */
  component.sslDisable = function( cb ){
    hell.o("start", "sslDisable", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          let input = { configuration:
            { ssl_enabled: false, ssl_cert: "", ssl_chain: "", ssl_key: "" }
          };

          await component.update({ name: "nginx"}, input );
          await component.stateApply( "nginx", "restart")

          let output_message = "ssl disabled";
          hell.o( output_message, "sslDisable", "info");

          if (cb) return cb(null, output_message );
          return success( output_message );

        } catch (err) {
          hell.o(err, "sslDisable", "error");
          if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
          return reject(err);
        }

      })(); // async

    }); // promise

  };

  component.remoteMethod('sslDisable', {
    accepts: [
      //{arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/sslDisable', verb: 'post', status: 200}
  });

  /**
   * SHELL CALL
   *
   * @param input
   * @param cb
   * @returns {Promise}
   */
  component.shelljsCall = function ( input, cb) {
    hell.o("start: " + input, "shelljsCall", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          shelljs.exec( input, {silent: true}, function (exit_code, stdout, stderr) {
            hell.o(["shelljs result ", exit_code], "shelljsCall", "info");
            let status = false, message = stderr;
            if (exit_code == 0) {
              status = true;
              message = "OK";
            }
            success({status: status, message: message, exit_code: exit_code});
          });

        } catch (err) {
          hell.o(err, "shelljsCall", "error");
          if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
          return success(err);
        }

      })();

    }); //promise

  };

  /**
   * COMPONENT CHECK for components without health url
   *
   * @param input
   * @returns {Promise}
   */
  component.checkStatusSystemctl = function (input) {
    hell.o(["start", input.name], "checkStatusSystemctl", "info");
    return new Promise((success, reject) => {

      (async function () {

        let output, service_name = input.name;
      switch (input.name) {
        case "autoupgrade":
          success({status: true, message: "OK", exit_code: 0});
          break;
        case "nfsen":
        case "suricata":
        case "evebox-agent":
        case "openvpn":
        case "vpn":
        case "telegraf":
          if (input.name == "vpn" || input.name == "openvpn") service_name = "'openvpn@detector'";

          hell.o("run systemctl", "checkStatusSystemctl", "info");
          output = await component.shelljsCall("/bin/systemctl status " + service_name);
          success( output );

          break;
        case "nginx":

          hell.o("run systemctl", "checkStatusSystemctl", "info");
          output = await component.shelljsCall("/bin/systemctl status " + input.name);

          if( ! input.ssl_enabled ) return success( output );

          /*
          SSL enabled, check if valid
           */
          let ssl_cert = input.configuration.ssl_cert, ssl_chain = input.configuration.ssl_chain,
            ssl_key = input.configuration.ssl_key;

          //no SSL to check
          if( ssl_cert.length < 100 || ssl_chain.length < 100 && ssl_key.length < 100 ){
            return success( output );
          }

          component.sslCheck( ssl_cert, ssl_chain, ssl_key, function( err, result ){
            if( err ){
              hell.o(["sslCheck err:", err ], "checkStatusSystemctl", "error");
              output.status = false;
              if( err.message !== undefined ) {
                output.message += " " + err.message;
              }
              return success(output);
            }
            hell.o(["sslCheck result:", result ], "checkStatusSystemctl", "info");
            output.message += " " + result;
            return success(output);
          });

        break;
        default:
          hell.o(["could not find component ", input], "checkStatusSystemctl", "error");
          success({message: "FAIL"});
      }

      })(); //async

    }); //promise

  };

  /**
   * COMPONENT CHECK via url
   *
   * @param input
   * @returns {Promise}
   */
  component.checkStatusFromHealthUrl = function (input) {
    hell.o(["start", input.name], "checkStatusFromHealthUrl", "info");

    return new Promise((success, reject) => {

      (async function () {
        let last_message;
        try {
          hell.o(["try health url", input.health_url], "checkStatusFromHealthUrl", "info");
          let result = await component.local_connection.get(input.health_url);
          if (!result || !result.data) throw new Error("no response from health url");

          if (result.status) {
            last_message = result.status + " ";
          }
          if (result.statusText) {
            last_message = result.statusText + " ";
          }

          success({status: true, message: last_message});

        } catch (err) {
          hell.o(err, "checkStatusFromHealthUrl", "error");

          last_message = "Check failed ";
          if ( err.code !== undefined && err.code) {
            last_message += "with error " + err.code;
          }
          if (err.errno !== undefined && err.errno) {
            last_message += " " + err.errno;
          }

          success({status: false, message: last_message});
        }

      })(); //async

    }); //promise

  };

  /**
   * CHECK COMPONENT STATUS
   *
   * components that have health url/api to check will be checked with http
   * other components get checked with systemctl status
   *
   * @param component_name
   * @param cb
   * @returns {Promise}
   */
  component.checkComponent = function ( component_name, cb) {
    hell.o("start: " + component_name, "checkComponent", "info");
    return new Promise((success, reject) => {

    (async function () {
      try {

        let comp, check_result, update_input, update_result;

        comp = await component.findOne({where: { name: component_name, installed: true, enabled: true}});
        if( !comp ) throw new Error( "Component not installed" );

        if (comp.health_url && comp.health_url.length > 5) {
          check_result = await component.checkStatusFromHealthUrl(comp);
        } else {
          check_result = await component.checkStatusSystemctl(comp);
        }

        if( check_result.exit_code === undefined ) check_result.exit_code = "";

        if (check_result.status) {
          hell.o([comp.name + " OK", check_result.message], "checkComponent", "info");
        } else {
          if( check_result.message == "" ){
            check_result.message = " exit code: " + check_result.exit_code;
          }
          hell.o([comp.name + " FAIL", check_result.message], "checkComponent", "error");
        }

        update_input = {
          status: check_result.status,
          message: check_result.message,
          exit_code: check_result.exit_code
        };

        hell.o([comp.name, "update component status"], "checkComponent", "info");
        update_result = await component.update({name: comp.name}, update_input);
        if (!update_result) throw new Error(comp.name + " failed to save component status");

        if (cb) return cb(null, check_result.message );
        return success( check_result.message );

      } catch (err) {
        hell.o(err, "checkComponent", "error");
        if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
        return reject(err);
      }

    })(); //async

    }); //promise

  };

  component.remoteMethod('checkComponent', {
    accepts: [
      {arg: "component_name", type: "string", required: true }
      //{arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/checkComponent', verb: 'post', status: 200}
  });

  /**
   * CHECK ALL COMPONENTS
   *
   * @param cb
   */
  component.components_routine_active = false;
  component.checkRoutine = function (options, cb) {
    hell.o("start", "checkRoutine", "info");

    if (component.components_routine_active) return cb({name: "Error", status: 400, message: "busy"});

    if (!component.app.models.central.CENTRAL_TOKEN || component.app.models.central.CENTRAL_TOKEN == "invalid") {
      hell.o("no API Key yet", "checkRoutine", "warn");
      return cb({name: "Error", status: 400, message: "no_api_token"});
    }

    component.components_routine_active = true;

    (async function () {
      try {
        let result = await component.find({where: {installed: true, enabled: true}});
        hell.o("found: " + result.length, "checkRoutine", "info");
        if (!result || result.length == 0) throw new Error("no_data_found");

        let comp, check_result;
        for (let i = 0, l = result.length; i < l; i++) {
          comp = result[i];
          check_result = await component.checkComponent( comp.name );
        }

        await component.app.models.central.lastSeen(null, "components", true);
        component.components_routine_active = false;

        cb(null, {message: "ok"});
      } catch (err) {
        hell.o(err, "checkRoutine", "error");
        await component.app.models.central.lastSeen(null, "components", false);
        component.components_routine_active = false;
        cb({name: "Error", status: 400, message: err});
      }

    })(); // async

  };

  component.remoteMethod('checkRoutine', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/checkRoutine', verb: 'get', status: 200}
  });

  /**
   * COMPONENT STATE APPLY
   *
   * install / uninstall / enable / disable via salt
   * @param name
   * @param options
   * @param cb
   */
  component.state_busy = false;
  component.stateApply = function (name, state, debug, options, cb) {
    hell.o("start", "stateApply", "info");
    return new Promise((success, reject) => {

      hell.o([name + " " + state, "start"], "stateApply", "info");

      if (component.state_busy) {
        hell.o([name + " " + state, "tried to run second salt, busy"], "stateApply", "warn");
        if (cb) return cb({name: "Error", status: 400, message: "worker_busy"});
        return reject({message: "installer is buys, please wait "});
      }

      component.state_busy = true;
      (async function () {
        try {

          let approved_check, comp, comp_input = {}, update_result, salt_input, salt_result;

          //TELEGRAF SPECIFIC, needs approval from central
          if (name == "telegraf") {
            approved_check = await component.app.models.registration.findOne({where: {registration_status: "Approved"}});
            hell.o([name + " " + state, "approved check"], "stateApply", "info");
            hell.o([name + " " + state, approved_check], "stateApply", "info");
            if (!approved_check) throw new Error("not_approved");
          }


          comp = await component.findOne({where: {name: name}});
          if (!comp) throw new Error("no_data_found");

          await component.update({name: comp.name}, {"loading": true});

          /**
           * =========================================================
           * DEV MODE
           *
           * fake salt calls
           */
          if (process.env.NODE_ENV == "dev" || debug == true) {
            hell.o([name + " " + state, "DEV no actual salt state is called"], "stateApply", "info");

            switch (state) {
              case "install":
                comp_input.installed = true;
                comp_input.enabled = true;
                if (name == "vpn") comp_input.enabled = false;
                break;
              case "uninstall":
                comp_input.installed = false;
                comp_input.enabled = false;
                comp_input.last_message = "";
                break;
              case "enabled":
                comp_input.enabled = true;
                break;
              case "disabled":
                comp_input.enabled = false;
                comp_input.last_message = "";
                break;
              case "restart":
                break;
            }

            //save to database
            if (state !== "restart") {
              update_result = await component.update({name: comp.name}, comp_input);
              hell.o([name + " " + state, update_result], "stateApply", "info");
            }

            hell.o([name + " " + state, "return dummy data"], "stateApply", "info");

            //for testing errors in the frontend
            let log_err = "";
            if (comp.name == "netdata") log_err = comp.name + ": test error for netdata... ";

            let output = {logs: comp.name + ": OK LOGS " + new Date(), logs_error: log_err, exit_code: 0};
            setTimeout(function () {
              component.state_busy = false;
              component.update({name: comp.name}, {loading: false});
              if (cb) return cb(null, output);
              return success(output);
            }, 2500);

            return;
          }

          /**
           * / end of DEV MODE
           * =========================================================
           */

          salt_input = {
            name: comp.name,
            state: state
          };

          //vpn specific salt
          if (( comp.name == "vpn" || comp.name == "openvpn" ) && state == "restart") salt_input.state = "vpn_enabled";

          //evebox-agent, evebox is restarting both
          if ( comp.name == "evebox-agent" && state == "restart") salt_input.name = "evebox";

          hell.o([ comp.name, "about to call salt.apply"], "stateApply", "info");

          salt_result = await component.app.models.salt.apply(salt_input);

          hell.o([ "salt result", salt_result ], "stateApply", "info");
          if (!salt_result) {
            throw new Error({message: "component.stateApply salt error", salt_result: salt_result});
          }

          comp_input = {};

          switch (state) {
            case "install":
              comp_input.installed = true;
              comp_input.enabled = true;
              break;
            case "uninstall":
              comp_input.installed = false;
              comp_input.enabled = false;
              break;
            case "enabled":
              comp_input.enabled = true;
              break;
            case "disabled":
              comp_input.enabled = false;
              break;
            case "restart":
              break;
          }

          if (state !== "restart") {
            hell.o([name + " " + state, "update db for component enabled: " +
            comp_input.enabled + " installed: " +
            comp_input.installed], "stateApply", "info");
            update_result = await component.update({name: comp.name}, comp_input);
            if (!update_result) throw new Error("component_install_save_failed");
          }

          component.state_busy = false;
          await component.update({name: comp.name}, {loading: false});

          hell.o([name + " " + state, "done"], "stateApply", "info");

          if (cb) return cb(null, salt_result);
          return success(salt_result);

        } catch (err) {
          hell.o(err, "stateApply", "error");
          component.state_busy = false;
          await component.update({name: name}, {loading: false});
          if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
          return reject(err);
        }

      })(); // async

    }); // promise

  };

  component.remoteMethod('stateApply', {
    accepts: [
      {arg: "name", type: "string", required: true},
      {arg: "state", type: "string", required: true},
      {arg: "debug", type: "boolean", required: false},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/stateApply', verb: 'post', status: 200}
  });

};
