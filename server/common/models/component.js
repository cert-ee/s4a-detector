'use strict';

const axios = require('axios');
const shelljs = require('shelljs');
const sudo = require('sudo');
const sslutils = require('ssl-utils');
const util = require('util');
const fs = require('fs');
const hell = new (require(__dirname + "/helper.js"))({module_name: "component"});

module.exports = function (component) {

  const default_components = [
    {
      name: "s4a-detector",
      friendly_name: "s4a-detector",
      package_name: "s4a-detector",
      message: "Already installed",
      network_interface_changes: false,
      web_url: false,
      install_order: 1,
      preset: true,
      after_approval: false,
      installed: true,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: false,
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "autoupgrade",
      friendly_name: "Auto upgrade",
      package_name: "unattended-upgrades",
      message: "",
      network_interface_changes: false,
      web_url: false,
      install_order: 1,
      preset: true,
      after_approval: false,
      installed: true,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: false,
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "nginx",
      friendly_name: "Nginx",
      package_name: "nginx",
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
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: "",
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
      package_name: "elasticsearch",
      message: "",
      network_interface_changes: false,
      web_url: false,
      health_url: "http://localhost:9200/_cluster/health",
      install_order: 2,
      preset: true,
      after_approval: false,
      installed: true,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: true,
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "suricata",
      friendly_name: "Suricata",
      package_name: "suricata",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "evebox",
      friendly_name: "Evebox",
      package_name: "evebox",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "evebox-agent",
      friendly_name: "Evebox Agent",
      package_name: "evebox",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "netdata",
      friendly_name: "Netdata",
      package_name: "netdata",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "moloch",
      friendly_name: "Moloch",
      package_name: "moloch",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: "",
      configuration:
        {
          drop_tls: false,
          yara_enabled: false,
          wise_enabled: false,
          exclude_ips: []
        }
    },
    {
      name: "molochcapture",
      friendly_name: "Moloch Capture",
      package_name: "moloch",
      message: "Will be installed with Moloch",
      network_interface_changes: false,
      web_url: false,
      preset: false,
      after_approval: false,
      installed: false,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: false,
      status: true,
      loading: false,
      version_status: false,
      version_installed: "",
      version_available: "",
    },
    {
      name: "molochviewer",
      friendly_name: "Moloch Viewer",
      package_name: "moloch",
      message: "Will be installed with Moloch",
      network_interface_changes: false,
      web_url: false,
      preset: false,
      after_approval: false,
      installed: false,
      installable: false,
      enabled: true,
      toggleable: false,
      restartable: false,
      status: true,
      loading: false,
      version_status: false,
      version_installed: "",
      version_available: "",
    },
    {
      name: "nfsen",
      friendly_name: "NFsen",
      package_name: "nfsen",
      message: "",
      network_interface_changes: true,
      web_url: "nfsen/",
      preset: false,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      restartable: false,
      status: true,
      loading: false,
      version_status: true,
      version_hold: false,
      version_status: false,
      version_installed: "",
      version_available: "",
      configuration:
        {
          sampling_rate: -1000
        }
    },
    {
      name: "kibana",
      friendly_name: "Kibana",
      package_name: "kibana",
      message: "",
      web_url: "kibana/",
      preset: true,
      installed: false,
      installable: true,
      enabled: false,
      toggleable: true,
      restartable: true,
      status: true,
      loading: false,
      version_status: true,
      version_hold: true,
      version_installed: "",
      version_available: "",
    },
    {
      name: "telegraf",
      friendly_name: "Telegraf",
      package_name: "telegraf",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    },
    {
      name: "vpn",
      friendly_name: "OpenVPN",
      package_name: "openvpn",
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
      status: false,
      loading: false,
      version_status: true,
      version_hold: false,
      version_installed: "",
      version_available: ""
    }
  ];


  /**
   * INITIALIZE
   *
   * ready http and create db entries if missing components
   */
  component.initialize = async function () {
    hell.o("start", "initialize", "info");
    component.local_connection = axios.create({});
    hell.o("local axios created", "initialize", "info");

    try {

      // await component.destroyAll();

      let component_found, update_component;
      for (const comp of default_components) {
        component_found = await component.findOrCreate({where: {name: comp.name}}, comp);
        if (!component_found) throw new Error("failed to create component " + comp.name);
        component_found = component_found[0];

        //loading false to all components
        await component.update({name: comp.name}, {"loading": false});
        // lets call this part "update script", if new version has extra details"
        // console.log(component_found);

        //MOLOCH CHANGES IF MISSING
        if (component_found.name === 'moloch') {
          if ('configuration' in component_found === false) {
            component_found.configuration = {};
          }
          if ('exclude_ips' in component_found.configuration === false) {
            update_component = {configuration: component_found.configuration};
            update_component.configuration.exclude_ips = [];
          }
          if ('yara_enabled' in component_found.configuration === false) {
            update_component = {configuration: component_found.configuration};
            update_component.configuration.yara_enabled = false;
          }
          if ('wise_enabled' in component_found.configuration === false) {
            update_component = {configuration: component_found.configuration};
            update_component.configuration.wise_enabled = false;
          }
          if ('drop_tls' in component_found.configuration === false) {
            update_component = {configuration: component_found.configuration};
            update_component.configuration.drop_tls = false;
          }

          if (update_component !== undefined) {
            hell.o(["update component: " + component_found.name + " defaults: configuration"], "initialize", "info");
            await component.update({name: comp.name}, update_component);
          }
        }

        // fill in defaults if missing
        for (let params in comp) {
          if (!comp.hasOwnProperty(params)) {
            update_component = {};
            update_component[params] = comp[params];
            console.log(update_component);
            hell.o(["update component: " + comp.name + " defaults: " + params, comp[params]], "initialize", "info");
            await component.update({name: comp.name}, update_component);
          }
        }

      }

      hell.o("done", "initialize", "info");

      return true;
    } catch (err) {
      hell.o(err, "initialize", "error");
      component.components_routine_active = false;
      return false;
    }

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
  component.sslCheck = function (ssl_cert, ssl_chain, ssl_key, cb) {
    hell.o("start", "sslCheck", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          // hell.o([ "ssl_cert", ssl_cert ], "sslCheck", "info");
          // hell.o([ "ssl_chain", ssl_chain ], "sslCheck", "info");
          // hell.o([ "ssl_key", ssl_key ], "sslCheck", "info");

          let ca_file_path_in_tmp = "/tmp/chain_for_ssl_check";
          let ssl_options = {"CAfile": ca_file_path_in_tmp};
          let result;

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
          let verifyCertificate = util.promisify(sslutils.verifyCertificate);
          result = await verifyCertificate(ssl_cert, ssl_options);
          if (result.valid !== true || result.verifiedCA !== true) {
            throw new Error("Certificate not valid: " + result.output);
          }

          hell.o("verify key", "sslCheck", "info");
          let verifyKey = util.promisify(sslutils.verifyKey);
          await verifyKey(ssl_key);

          hell.o("compare moduli", "sslCheck", "info");
          let compareModuli = util.promisify(sslutils.compareModuli);
          await compareModuli(ssl_cert, ssl_key);

          hell.o("check expiration", "sslCheck", "info");
          let checkCertificateExpiration = util.promisify(sslutils.checkCertificateExpiration);
          result = await checkCertificateExpiration(ssl_cert);

          let remaining_time = result.getTime() - Date.now();
          let one_day = 24 * 60 * 60 * 1000;
          let remaining_days = Math.round(remaining_time / one_day);

          let output_message = "SSL expires after days: " + remaining_days;
          if (remaining_days <= 15) {
            throw new Error(output_message);
          }

          hell.o(["ssl ok ", output_message], "sslCheck", "info");

          if (cb) return cb(null, output_message);
          return success(output_message);

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
  component.sslDisable = function (cb) {
    hell.o("start", "sslDisable", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          let input = {
            configuration:
              {ssl_enabled: false, ssl_cert: "", ssl_chain: "", ssl_key: ""}
          };

          await component.update({name: "nginx"}, input);
          await component.stateApply("nginx", "restart")

          let output_message = "ssl disabled";
          hell.o(output_message, "sslDisable", "info");

          if (cb) return cb(null, output_message);
          return success(output_message);

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
  component.shelljsCall = function (input, cb) {
    hell.o("start: " + input, "shelljsCall", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          shelljs.exec(input, {silent: true}, function (exit_code, stdout, stderr) {
            hell.o(["shelljs result ", exit_code], "shelljsCall", "info");
            let status = false, message = stderr;
            if (exit_code == 0) {
              status = true;
              message = "OK";
            }
            success({status: status, message: message, exit_code: exit_code, logs: stdout, logs_error: stderr});
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
            success({status: true, message: "OK", exit_code: 0, logs: false, logs_error: false});
            break;
          case "kibana":
          case "suricata":
          case "evebox-agent":
          case "vpn":
          case "telegraf":
          case "s4a-detector":
          case "molochviewer":
          case "molochcapture":
            if (input.name == "vpn") service_name = "'openvpn@detector'";

            hell.o("run systemctl", "checkStatusSystemctl", "info");
            output = await component.shelljsCall("/bin/systemctl status " + service_name);

            success(output);

            break;
          case "nginx":

            hell.o("run systemctl", "checkStatusSystemctl", "info");
            output = await component.shelljsCall("/bin/systemctl status " + input.name);

            if (!input.ssl_enabled) return success(output);

            /*
            SSL enabled, check if valid
             */
            let ssl_cert = input.configuration.ssl_cert, ssl_chain = input.configuration.ssl_chain,
              ssl_key = input.configuration.ssl_key;

            //no SSL to check
            if (ssl_cert.length < 100 || ssl_chain.length < 100 && ssl_key.length < 100) {
              return success(output);
            }

            component.sslCheck(ssl_cert, ssl_chain, ssl_key, function (err, result) {
              if (err) {
                hell.o(["sslCheck err:", err], "checkStatusSystemctl", "error");
                output.status = false;
                if (err.message !== undefined) {
                  output.message += " " + err.message;
                  output.logs += " " + result;
                  output.logs_error += " " + JSON.stringify(err);
                }
                return success(output);
              }
              hell.o(["sslCheck result:", result], "checkStatusSystemctl", "info");
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

          if (input.name == "elastic") {
            if (result.data.status == "green" || result.data.status == "yellow" ) {
              last_message = last_message + " Elastic status is " + result.data.status ;
            } else {
              throw new Error('Elastic status ' + result.data.status);
            }
          }

          success({status: true, message: last_message, logs: last_message, logs_error: "", exit_code: ""});

        } catch (err) {
          hell.o(err, "checkStatusFromHealthUrl", "error");

          last_message = "Check failed ";
          if (err.code !== undefined && err.code) {
            last_message += "with error " + err.code;
          }
          if (err.errno !== undefined && err.errno) {
            last_message += " " + err.errno;
          }
          // if (typeof err !== "object") {
            last_message += " " + err;
          // }

          success({status: false, message: last_message, logs: "", logs_error: last_message, exit_code: ""});
        }

      })(); //async

    }); //promise

  };


  /**
   * CHECK APT PACKAGE VERSION VIA SUDO
   *
   * @param package_name
   * @returns {Promise<{logs_error: string, exit_code: number, logs: string}>}
   */
  component.checkPackageVersions = async function (package_name) {
    hell.o([package_name, "start"], "checkPackageVersions", "info");
    let output = {
      version_installed: "Error",
      version_available: "error",
      version_status: false,
      version_hold: false,
      logs: "",
      logs_error: "",
      exit_code: 0
    };

    try {

      let options = {
        cachePassword: true,
        spawnOptions: {/* other options for spawn */}
      };

      // hell.o("/usr/bin/apt-mark showhold", "checkPackageVersions", "info");
      // let showhold = await component.shelljsCall("/usr/bin/apt-mark showhold");
      // console.log( showhold );

      /*
      APT-MARK
       */
      let aptmark_output = {
        logs: "",
        logs_error: "",
        exit_code: 0
      };
      hell.o("/usr/bin/apt-mark showhold", "checkPackageVersions", "info");
      let aptmark = sudo(['-E', '/usr/bin/apt-mark', 'showhold'], options);

      aptmark.stdout.on('data', function (data) {
        aptmark_output.logs += data.toString();
        aptmark_output.logs_error += "";
      });

      aptmark.stderr.on('data', function (data) {
        aptmark_output.logs += data.toString();
        aptmark_output.logs_error += data.toString().trim();
      });

      aptmark_output.exit_code = await new Promise((done) => {
        aptmark.on('close', function (exit_code) {
          aptmark_output.exit_code = exit_code;
          done(exit_code);
          return;
        });
      });

      for (let row of aptmark_output.logs.split('\n')) {
        if (row.match(package_name)) {
          hell.o([package_name, "in apt hold list"], "checkPackageVersions", "info");
          output.version_hold = true;
        }
      }

      /*
      APT-CACHE
       */
      hell.o("/usr/bin/apt-cache policy " + package_name, "checkPackageVersions", "info");
      let child = sudo(['-E', '/usr/bin/apt-cache', 'policy', package_name], options);

      child.stdout.on('data', function (data) {
        output.logs += data.toString();
        output.logs_error += "";
      });

      child.stderr.on('data', function (data) {
        output.logs += data.toString();
        output.logs_error += data.toString().trim();
      });

      let exit_code = await new Promise((done) => {
        child.on('close', function (exit_code) {
          output.exit_code = exit_code;
          done(exit_code);
          return;
        });
      });

      let splitted;
      for (let row of output.logs.split('\n')) {
        if (row.match('Installed:')) {
          splitted = row.split('Installed: ');
          output.version_installed = splitted[1].trim();
        }
        if (row.match('Candidate:')) {
          splitted = row.split('Candidate: ');
          output.version_available = splitted[1].trim();
        }
      }

      if (output.version_installed === output.version_available || output.version_hold) {
        output.version_status = true;
      }

      hell.o([package_name + " installed", output.version_installed], "checkPackageVersions", "info");
      hell.o([package_name + " available", output.version_available], "checkPackageVersions", "info");

      hell.o([package_name, "done"], "checkPackageVersions", "info");
      return output;

    } catch (err) {
      hell.o(err.message, "checkPackageVersions", "error");
      hell.o(sudo.output, "checkPackageVersions", "error");
      salt.output.error = err;
      return
    }

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
  component.checkComponent = function (component_name, cb) {
    hell.o("start: " + component_name, "checkComponent", "info");
    return new Promise((success, reject) => {

      (async function () {
        try {

          let comp, check_result, update_input, update_result, package_versions, installed_version = "",
            available_version = "", package_version_status = true;

          comp = await component.findOne({where: {name: component_name, installed: true, enabled: true}});

          if (!comp) throw new Error("Component not installed");

          if (comp.health_url && comp.health_url.length > 5) {
            check_result = await component.checkStatusFromHealthUrl(comp);
          } else {
            check_result = await component.checkStatusSystemctl(comp);
          }

          if (check_result.status) {
            hell.o([comp.name + " OK", check_result.message], "checkComponent", "info");
          } else {
            if (check_result.message == "") {
              check_result.message = " exit code: " + check_result.exit_code;
            }
            hell.o(["exit code", check_result.exit_code], "checkComponent", "error");
            hell.o([comp.name + " FAIL", check_result.message], "checkComponent", "error");
          }

          /*
          GET PACKAGE VERSIONS
           */
          hell.o([comp.name + "", "check versions"], "checkComponent", "info");
          if (process.env.NODE_ENV == "dev") {
            package_versions = {
              version_status: true,
              version_hold: false,
              version_installed: "old",
              version_available: "new",
            };
            if (comp.name == "elastic") {
              package_versions.version_hold = true;
            }
          } else {
            package_versions = await component.checkPackageVersions(comp.package_name);
          }
          // hell.o([package_versions, "check versions"], "checkComponent", "info");

          update_input = {
            status: check_result.status,
            message: check_result.message,
            exit_code: check_result.exit_code,
            logs: check_result.logs,
            logs_error: check_result.logs_error,
            version_status: package_versions.version_status,
            version_hold: package_versions.version_hold,
            version_installed: package_versions.version_installed,
            version_available: package_versions.version_available
          };

          hell.o([comp.name, "update component status"], "checkComponent", "info");
          update_result = await component.update({name: comp.name}, update_input);
          if (!update_result) throw new Error(comp.name + " failed to save component status");

          if (cb) return cb(null, check_result);
          return success(check_result);

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
      {arg: "component_name", type: "string", required: true}
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
          check_result = await component.checkComponent(comp.name);
        }

        // update uninstalled components
        let uninstalled = await component.find({where: {installed: false}});
        for (let i = 0, l = uninstalled.length; i < l; i++) {
          comp = uninstalled[i];
          if (!comp.status || !comp.version_status) {
            await component.update({name: comp.name}, {status: true, version_status: true});
          }
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
  component.stateApply = function (name, state, debug, options, httpReq, cb) {
    hell.o("start", "stateApply", "info");

    if (httpReq !== undefined) {
      // console.log( httpReq );
      hell.o("apply no timeout to http call", "stateApply", "info");
      httpReq.setTimeout(0);
    }

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
                comp_input.version_status = true;
                comp_input.status = true;
                comp_input.last_message = "";
                break;
              case "enabled":
                comp_input.enabled = true;
                break;
              case "disabled":
                comp_input.installed = true;
                comp_input.enabled = false;
                comp_input.status = true;
                // comp_input.last_message = "";
                break;
              case "restart":
              case "reload":
                break;
            }

            //save to database
            if (state !== "restart" && state !== "reload") {
              update_result = await component.update({name: comp.name}, comp_input);
              hell.o([name + " " + state, update_result], "stateApply", "info");
            }

            component.state_busy = false;
            await component.update({name: comp.name}, {loading: false});
            comp = await component.findOne({where: {name: comp.name}});

            if (comp.name == "evebox" && (!comp.installed || !comp.enabled)) {
              hell.o([name + " " + state, "exebox disabled, do the same for evebox-agent"], "stateApply", "info");
              update_result = await component.update({name: 'evebox-agent'}, {
                installed: false,
                enabled: false
              });
            }

            if (comp.name == "evebox" && comp.installed && comp.enabled) {
              hell.o([name + " " + state, "exebox enabled, do the same for evebox-agent"], "stateApply", "info");
              update_result = await component.update({name: 'evebox-agent'}, {
                installed: true,
                enabled: true
              });
            }

            if (comp.name == "moloch" && (!comp.installed || !comp.enabled)) {
              hell.o([name + " " + state, "moloch disabled, do the same for molochcapture and molochviewer"], "stateApply", "info");
              update_result = await component.update({name: 'molochcapture'}, {
                installed: false,
                enabled: false
              });
              update_result = await component.update({name: 'molochviewer'}, {
                installed: false,
                enabled: false
              });
            }

            if (comp.name == "moloch" && (comp.installed || comp.enabled)) {
              hell.o([name + " " + state, "moloch enabled, do the same for molochcapture and molochviewer"], "stateApply", "info");
              update_result = await component.update({name: 'molochcapture'}, {
                installed: true,
                enabled: true
              });
              update_result = await component.update({name: 'molochviewer'}, {
                installed: true,
                enabled: true
              });
            }

            if (comp.installed && comp.enabled) {
              hell.o([name + " " + state, "perform component check"], "stateApply", "info");
              await component.checkComponent(comp.name);
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

          //evebox-agent, evebox is restarting both
          if (comp.name == "evebox-agent" && state == "restart") salt_input.name = "evebox";

          hell.o([comp.name, "about to call salt.apply"], "stateApply", "info");

          salt_result = await component.app.models.salt.apply(salt_input);

          hell.o(["salt result", salt_result], "stateApply", "info");
          if (!salt_result) {
            throw new Error({message: "component.stateApply salt error", salt_result: salt_result});
          }

          comp_input = {};

          switch (state) {
            case "install":
              comp_input.installed = true;
              //ovpn is not enabled after install
              comp_input.enabled = true;
              if (name == "vpn") comp_input.enabled = false;
              break;
            case "uninstall":
              comp_input.installed = false;
              comp_input.enabled = false;
              comp_input.version_status = true;
              comp_input.status = true;
              comp_input.last_message = "";
              break;
            case "enabled":
              comp_input.installed = true;
              comp_input.enabled = true;
              break;
            case "disabled":
              comp_input.installed = true;
              comp_input.enabled = false;
              comp_input.status = true;
              break;
            case "restart":
            case "reload":
              break;
          }

          if (state !== "restart" && state !== "reload") {
            hell.o([name + " " + state, "update db for component enabled: " +
            comp_input.enabled + " installed: " +
            comp_input.installed], "stateApply", "info");
            update_result = await component.update({name: comp.name}, comp_input);
            if (!update_result) throw new Error("component_install_save_failed");
          }

          component.state_busy = false;
          await component.update({name: comp.name}, {loading: false});
          comp = await component.findOne({where: {name: comp.name}});

          if (comp.name == "evebox" && (!comp.installed || !comp.enabled)) {
            hell.o([name + " " + state, "exebox disabled, do the same for evebox-agent"], "stateApply", "info");
            update_result = await component.update({name: 'evebox-agent'}, {
              installed: false,
              enabled: false
            });
          }

          if (comp.name == "evebox" && comp.installed && comp.enabled) {
            hell.o([name + " " + state, "exebox enabled, do the same for evebox-agent"], "stateApply", "info");
            update_result = await component.update({name: 'evebox-agent'}, {
              installed: true,
              enabled: true
            });
          }

          if (comp.installed && comp.enabled) {
            hell.o([name + " " + state, "perform component check"], "stateApply", "info");
            await component.checkComponent(comp.name);
          }

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
      {arg: "options", type: "object", http: "optionsFromRequest"},
      {arg: "req", type: "object", http: {source: "req"}}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/stateApply', verb: 'post', status: 200}
  });


  /**
   * TEST
   */
  component.stateApplyTEST = function (name, state, debug, options, httpReq, cb) {
    hell.o("start", "stateApplyTest", "info");

    // console.log( httpReq )
    if (httpReq !== undefined) {
      console.log(httpReq);
      hell.o("appy no timeout to http call", "stateApplyTest", "info");
      httpReq.setTimeout(0);
    }

    return new Promise((success, reject) => {

      (async function () {
        try {

          hell.o(["start", new Date()], "stateApplyTest", "info");
          let timer = 60000 * 20;

          setTimeout(function () {

            hell.o([name + " " + state, "done"], "stateApplyTest", "info");
            hell.o(["end", new Date()], "stateApplyTest", "info");

            let output = {message: "end of test"};
            if (cb) return cb(null, output);
            return success(output);

          }, timer);

        } catch (err) {
          hell.o(err, "stateApplyTest", "error");
          if (cb) return cb({name: "Error", status: 400, message: err.message, data: err});
          return reject(err);
        }

      })(); // async

    }); // promise

  };

  component.remoteMethod('stateApplyTEST', {
    accepts: [
      {arg: "name", type: "string", required: true},
      {arg: "state", type: "string", required: true},
      {arg: "debug", type: "boolean", required: false},
      {arg: "options", type: "object", http: "optionsFromRequest"},
      {arg: "req", type: "object", http: {source: "req"}}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/stateApplyTEST', verb: 'post', status: 200}
  });


};
