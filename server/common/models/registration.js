'use strict';
const machineId = require('node-machine-id');
const shelljs = require('shelljs');
const fs = require('fs');
const hell = new (require(__dirname + "/helper.js"))({module_name: "registration"});

module.exports = function (registration) {

  const PATH_CSR_UNSIGNED = process.env.PATH_CSR_UNSIGNED;
  const PATH_CSR_SIGNED = process.env.PATH_CSR_SIGNED;

  const machine_id = machineId.machineIdSync();

  hell.o(machine_id, "load", "info");

  /**
   * REGISTRATION START
   *
   * First step
   *
   * @param first_name
   * @param last_name
   * @param organization_name
   * @param contact_phone
   * @param contact_email
   * @param options
   * @param cb
   */
  registration.initiate = function (first_name, last_name, organization_name, contact_phone, contact_email, options, cb) {
    hell.o("start", "initiate", "info");

    (async function () {

      try {
        let registration_data = {
          name: machine_id,
          first_name: first_name,
          last_name: last_name,
          organization_name: organization_name,
          contact_phone: contact_phone,
          contact_email: contact_email,
          machine_id: machine_id + "_" + Math.floor(new Date()),
          registration_status: "Started"
        };

        //clear any failed registration attempts
        await registration.destroyAll({});

        hell.o("create registration", "initiate", "info");
        let created = await registration.create(registration_data);
        if (!created) throw new Error("registration_save_failed");

        hell.o("create ( read ) csr", "initiate", "info");
        let csr_unsigned;
        try {
          csr_unsigned= await registration.createCsr(registration_data);
        } catch (e) {
          hell.o("failed to read CSR file", "initiate", "error");
          hell.o(e, "initiate", "error");
          throw new Error("registration_csr_read_failed");
        }

        registration_data.csr_unsigned = csr_unsigned;

        hell.o("post registration to central", "initiate", "info");
        let central_result;
        try {
          central_result = await registration.app.models.central.connector().post("/registration/request", registration_data);
          hell.o(["central response", central_result.data], "initiate", "info");
        } catch (err) {

          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        hell.o("update token", "initiate", "info");
        let update_token = await registration.app.models.central.updateToken(
          {temporary: central_result.data.temporary, token: central_result.data.token});
        if (!update_token) throw new Error("central_token_update_failed");

        let central_input = {registration_status: "Pending"};
        if( central_result.data.temporary_name !== undefined ) {
          central_input.temporary_name = central_result.data.temporary_name;
        }

        hell.o("update registration status and unapproved temporary name", "initiate", "info");
        let update_status = await registration.update({id: "registrationid"}, central_input );
        if (!update_status) throw new Error("registration_save_failed");

        hell.o("done", "initiate", "info");
        registration.app.models.central.lastSeen(true);

        cb(null, registration_data);
      } catch (err) {
        hell.o(err, "initiate", "error");
        try {
          await registration.update({id: "registrationid"}, {registration_status: "Failed"});
        } catch (e) {
          hell.o(e, "initiate", "error");
        }

        cb({name: "Error", status: 400, message: err.message});
      }

    })(); //async

  };

  registration.remoteMethod('initiate', {
    accepts: [
      {arg: 'first_name', type: 'string', required: true},
      {arg: 'last_name', type: 'string', required: true},
      {arg: 'organization_name', type: 'string', required: true},
      {arg: 'contact_phone', type: 'string', required: true},
      {arg: 'contact_email', type: 'string', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/initiate', verb: 'post', status: 201}
  });

  /**
   * CREATE CSR
   *
   * @param registration_data
   * @returns {Promise}
   */
  registration.createCsr = function (registration_data) {
    hell.o("start", "createCsr", "info");

    return new Promise((success, reject) => {

      if (process.env.NODE_ENV == "dev") {
        hell.o("DEV mode, return dummy", "createCSR", "warn");
        success("CSR DEMO " + new Date());
        return;
      }

      hell.o("read csr file", "createCSR", "error");
      fs.readFile(PATH_CSR_UNSIGNED, 'utf8', function (err, contents) {
        if (err) {
          hell.o(["csr read failed", PATH_CSR_UNSIGNED ], "createCSR", "error");
          hell.o(err, "createCSR", "error");
          reject(err);
          return;
        }
        hell.o(["csr contents", contents], "createCsr", "info");
        success(contents);
      });

    });

  };

  /**
   * SAVE THE VPN TUNNEL FILE
   *
   * @param input
   * @returns {Promise}
   */
  registration.signedCsrSave = function (input) {
    hell.o("start", "signedCsrSave", "info");

    return new Promise((success, reject) => {

      if (process.env.NODE_ENV == "dev") {
        hell.o("DEV mode, return dummy", "signedCsrSave", "warn");
        success("CSR DEMO " + new Date());
        return;
      }

      fs.writeFile(PATH_CSR_SIGNED, input.csr_signed, function (err) {
        if (err) {
          hell.o(["csr save failed", PATH_CSR_SIGNED ], "signedCsrSave", "error");
          hell.o(err, "signedCsrSave", "error");
          //let message = "could not write vpn tunnel file";
          //reject( "coult not write vpn tunnel file");
          return reject(false);
        }
        hell.o("csr saved", "signedCsrSave", "info");
        success(true);
      });

    }); // promise
  };

  /**
   * REGISTRATION APPLICATION WAS REJECTED
   *
   * @returns {Promise}
   */
  registration.registrationRejected = function () {
    hell.o("start", "registrationRejected", "info");

    return new Promise((success, reject) => {

      (async function () {
        try {

          hell.o("confirm with central", "registrationRejected", "info");
          let complete_registration;
          try {
            complete_registration = await registration.app.models.central.connector().get("/registration/completeRegistrationRejected");
            hell.o(["central response", complete_registration.data], "registrationRejected", "info");
          } catch (err) {
            let out = "Central API down [ " + err.message + " ]";
            if (err.response && err.response.data
              && err.response.data.error && err.response.data.error.message) {
              out = err.response.data.error.message;
            }
            throw new Error(out);
          }

          hell.o("update central token", "registrationRejected", "info");
          let token_renew = registration.app.models.central.updateToken({token: "", temporary: true});
          if (!token_renew) throw new Error("central_token_update_failed");

          let reject_reason = ""; //if there is a rejection reason, save it
          if (complete_registration.data.reject_reason) {
            reject_reason = complete_registration.data.reject_reason;
          }

          let update_info = {
            registration_status: "Rejected",
            reject_reason: reject_reason
          };

          hell.o("update registration", "registrationRejected", "info");
          let registration_status_update = await registration.update({id: "registrationid"}, update_info);
          if (!registration_status_update) throw new Error("registration_save_failed");

          hell.o("done", "registrationRejected", "info");
          success({message: "Registration rejection completed"});

        } catch (err) {
          hell.o(err, "registrationRejected", "error");
          reject(err);
        }

      })(); // async

    }); // promise

  };


  /**
   * REGISTRATION APPROVED
   *
   * save latest info and unique name from central
   *
   * @returns {Promise}
   */
  registration.registrationApproved = function () {
    hell.o("start", "registrationApproved", "info");

    return new Promise((success, reject) => {

      (async function () {
        try {

          hell.o("confirm with central", "registrationApproved", "info");
          let complete_registration;
          try {
            complete_registration = await registration.app.models.central.connector().get("/registration/completeRegistration");
            hell.o(["central response", complete_registration.data], "registrationApproved", "info");
          } catch (err) {
            let out = "Central API down [ " + err.message + " ]";
            if (err.response && err.response.data
              && err.response.data.error && err.response.data.error.message) {
              out = err.response.data.error.message;
            }
            throw new Error(out);
          }

          hell.o("save vpn conf file", "registrationApproved", "info");
          let csr_saved;
          try {
            csr_saved = await registration.signedCsrSave(complete_registration.data);
          } catch (e) {
            hell.o("failed to save vpn conf file", "registrationApproved", "error");
            hell.o(e, "registrationApproved", "error");
            throw new Error("registration_csr_save_failed");
          }

          hell.o("update token", "registrationApproved", "info");
          let token_renew = registration.app.models.central.updateToken(complete_registration.data.token);
          if (!token_renew) throw new Error("central_token_update_failed");

          let update_registration = {
            unique_name: complete_registration.data.unique_name,
            first_name: complete_registration.data.first_name,
            last_name: complete_registration.data.last_name,
            organization_name: complete_registration.data.organization_name,
            contact_phone: complete_registration.data.contact_phone,
            contact_email: complete_registration.data.contact_email,
            registration_status: "Approved"
          };

          hell.o("update registration status", "registrationApproved", "info");
          let registration_status_update = await registration.update({id: "registrationid"}, update_registration);
          if (!registration_status_update) throw new Error("registration_save_failed");

          hell.o(["run salt to install telegraf with unique name", complete_registration.data.unique_name], "registrationApproved", "info");

          let salt_result = await registration.app.models.component.stateApply("telegraf", "install");
          if (!salt_result) throw new Error("component_install_failed");

          hell.o("done", "registrationApproved", "info");
          success({message: "Registration completed"});
        } catch (err) {
          hell.o(err, "registrationApproved", "error");
          reject(err);
        }

      })(); // async

    }); // promise

  };

  /**
   * UNIQUE NAME ENDPOINT FOR SALTS
   *
   * @param options
   * @param cb
   */
  registration.uniqueName = function (options, cb) {
    hell.o("start", "uniqueName", "info");

    (async function () {
      try {

        hell.o("find", "uniqueName", "info");
        let output = await registration.findOne({fields: ["unique_name"]});
        if (!output) throw new Error("load_failed");

        if (output.unique_name == "Unregistered") output.unique_name = false;
        hell.o(["done", output], "uniqueName", "info");
        cb(null, output);
      } catch (err) {
        hell.o(err, "uniqueName", "error");
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  registration.remoteMethod('uniqueName', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/uniqueName', verb: 'get', status: 200}
  });

  /**
   * TOKEN RENEWAL
   *
   * for later, feature is turned off
   *
   * @param options
   * @param cb
   */
  registration.renewToken = function (options, cb) {
    hell.o("start", "renewToken", "info");

    (async function () {
      try {

        hell.o("check with central", "renewToken", "info");
        let new_token;
        try {
          new_token = await registration.app.models.central.connector().get("/registration/rollToken");
          hell.o(["central result", new_token.data], "renewToken", "info");
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }
          throw new Error(out);
        }

        hell.o("update token", "renewToken", "info");
        let renew = await registration.app.models.central.updateToken(new_token.data);
        if (!renew) throw new Error("central_token_update_failed");

        hell.o("done", "renewToken", "info");
        cb(null, new_token.data);
      } catch (err) {
        hell.o(err, "renewToken", "error");
        cb({name: "Error", status: 400, message: "central_token_update_failed"});
      }

    })(); // async

  };

  registration.remoteMethod('renewToken', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/renewToken', verb: 'post', status: 201}
  });


  /**
   * RESET FUNCTION
   *
   * for development
   *
   * @param options
   * @param cb
   */
  registration.resetDetector = function (options, cb) {
    hell.o("start", "resetDetector", "warn");

    // if( process.env.NODE_ENV !== "dev" ) {
    //   hell.o("ENV is not DEV, fail", "resetDetector", "warn");
    //   cb("error");
    //   return false;
    // }

    (async function () {
      try {

        hell.o("destroy database", "resetDetector", "warn");
        await registration.destroyAll();
        await registration.app.models.central.destroyAll();
        await registration.app.models.component.destroyAll();
        await registration.app.models.network_interfaces.destroyAll();
        await registration.app.models.rule.destroyAll();
        await registration.app.models.rule_draft.destroyAll();
        await registration.app.models.ruleset.destroyAll();
        await registration.app.models.log.destroyAll();
        await registration.app.models.role.destroyAll();

        cb(null, {message: "Reset Done"});

        hell.o("restart process", "resetDetector", "warn");
        if (process.env.NODE_ENV == "dev") {
          hell.o("restart nodemon", "resetDetector", "warn");
          shelljs.touch("server.js"); // kick nodemon
        } else {
          hell.o("pm2 restart", "resetDetector", "warn");
          //process.exit(1); //pm2
        }

      } catch (err) {
        console.log("RESET: registration.resetDetector failed");
        cb(err);
      }

    })(); // async

  };

  registration.remoteMethod('resetDetector', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/resetDetector', verb: 'get', status: 200}
  });

};
