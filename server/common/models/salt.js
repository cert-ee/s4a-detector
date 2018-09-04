'use strict';
const sudo = require('sudo');
const hell = new (require(__dirname + "/helper.js"))({module_name: "salt"});

module.exports = function (salt) {

  salt.output = {};

  /**
   * APPLY SALT STATE
   *
   * @param input
   * @returns {Promise<any>}
   */
  salt.apply = function (input) {

    hell.o([ input.name + " run salt state", input.state], "apply", "info");

    return new Promise((success, reject) => {
      (async function () {
        try {

          let states = ['install', 'uninstall', 'enabled', 'disabled', 'restart'];
          let state = input.state;
          let state_name = 'detector/' + input.name;

          if (!states.includes(state)) throw new Error("load_failed");

          if (!['install', 'restart'].includes(state)) {
            state_name = state_name + "_" + state;
          }

          salt.output = {exit_code: false, logs: "", logs_error: ""};

          let options = {
            cachePassword: true,
            spawnOptions: {/* other options for spawn */}
          };

          hell.o([ input.name, "start"], "apply", "info");
          let child = sudo(['/usr/bin/salt-call', 'state.apply', state_name], options);

          child.stdout.on('data', function (data) {
            salt.output.logs += data.toString();
            salt.output.logs_error += "";
          });

          child.stderr.on('data', function (data) {
            salt.output.logs += data.toString();
            salt.output.logs_error += data.toString().trim(); //TODO: ignore only whitespace entries, error_log in components view
          });

          let exit_code = await new Promise((done) => {
            child.on('close', function (exit_code) {
              salt.output.exit_code = exit_code;
              done(exit_code);
              return;
            });
          });

          if (exit_code !== 0) throw new Error("salt_failed");

          hell.o( salt.output, "apply", "info");
          success(salt.output);

        } catch (err) {

          hell.o( err.message, "apply", "error");
          hell.o( salt.output, "apply", "error");
          salt.output.error = err;
          reject(salt.output);
        }

      })(); // async

    }); // promise

  };

};
