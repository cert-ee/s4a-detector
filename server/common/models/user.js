'use strict';

const shelljs = require('shelljs');
const shellescape = require('shell-escape');
const axios = require('axios');
const hell = new (require(__dirname + "/helper.js"))({module_name: "user"});

module.exports = function (user) {
  delete user.validations.email;
  delete user.validations.password;


  /**
   * GET USER TOKEN
   *
   * @param options
   * @param cb
   */
  user.currentToken = function (user_id, options, cb) {
    hell.o(["start", user_id], "currentToken", "info");

    (async function () {
      try {

        let user_check = await user.findById(user_id);
        if (!user_check) throw new Error("no_data");

        let token = await user.app.models.accessToken.findOne({where: {userId: user_id}});
        if (!token) throw new Error("could not find token");
        // hell.o(["token", token], "currentToken", "info");

        hell.o("done", "currentToken", "info");
        let output = {token: token.id};
        cb(null, output);
      } catch (err) {
        hell.o(err, "currentToken", "error");
        cb({name: "Error", status: 400, message: "No token found, renew token"});
      }

    })(); // async

  };

  user.remoteMethod('currentToken', {
    accepts: [
      {arg: 'user_id', type: 'string', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/currentToken', verb: 'post', status: 200}
  });


  /**
   * RENEW USER TOKEN
   *
   * @param options
   * @param cb
   */
  user.renewToken = function (user_id, options, cb) {
    hell.o(["start", user_id], "renewToken", "info");

    (async function () {
      try {

        let user_check = await user.findById(user_id);
        if (!user_check) throw new Error("no_data");

        hell.o("find old tokens", "renewToken", "info");
        let old_tokens = await user.app.models.AccessToken.find({where: {userId: user_id}});
        for (let old_token of old_tokens) {
          hell.o(["destroy old token", old_token.id], "renewToken", "info");
          await user.app.models.AccessToken.destroyById(old_token.id)
        }

        hell.o([user_id, "generate new token"], "renewToken", "info");
        let token_info = {ttl: -1, userId: user_id};
        let create_token = await user.app.models.AccessToken.create(token_info);
        if (!create_token) throw new Error("failed to generate new token");

        let output = {token: create_token.id};
        hell.o("done", "renewToken", "info");
        cb(null, output);
      } catch (err) {
        hell.o(err, "renewToken", "error");
        cb({name: "Error", status: 400, message: "Failed to generate new token"});
      }

    })(); // async

  };

  user.remoteMethod('renewToken', {
    accepts: [
      {arg: 'user_id', type: 'string', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/renewToken', verb: 'post', status: 200}
  });


  /**
   * CREATE USER
   *
   * add to moloch
   *
   * @param username
   * @param options
   * @param cb
   */
  user.createUser = function (username, options, cb) {
    hell.o("start", "createUser", "info");
    hell.o(username, "createUser", "info");

    (async function () {
      try {
        user.local_connection = axios.create({});

        let user_find = await user.findOne({where: {username: username}});
        if (user_find) throw new Error("duplicate_data");

        let user_create = await user.create({username: username});
        if (!user_create) throw new Error("failed to create user");

        let comp = await user.app.models.component.findOne({where: {name: "moloch", installed: true, enabled: true}})
        if (comp && process.env.NODE_ENV != "dev") {
          user.local_connection.post("http://localhost:9200/arkime_users/_doc/" + username,
            {
              "removeEnabled": false,
              "userName": username,
              "emailSearch": true,
              "enabled": false,
              "webEnabled": true,
              "headerAuthEnabled": true,
              "createEnabled": false,
              "settings": {},
              "passStore": "",
              "userId": username
            }
          );
          user.local_connection = "";
        }

        user_find = await user.findOne({where: {username: username}});

        hell.o("done", "createUser", "info");
        cb(null, user_find);
      } catch (err) {
        hell.o(err, "createUser", "error");
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  user.remoteMethod('createUser', {
    accepts: [
      {arg: 'username', type: 'string', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/createUser', verb: 'post', status: 200}
  });

  /**
   * EDIT MOLOCH USER
   *
   * @param username
   * @param input
   * @param cb
   */
  user.editMolochUser = function (username, active, rolename, cb) {
    hell.o("start", "editMolochUser", "info");
    hell.o(username, "editMolochUser", "info");

    (async function () {
      try {
        user.local_connection = axios.create({});

        let user_find = await user.findOne({where: {username: username}});
        if (!user_find) throw new Error("no_data");

        let comp = await user.app.models.component.findOne({where: {name: "moloch", installed: true, enabled: true}});

        if (comp && process.env.NODE_ENV != "dev") {

          let moloch_input = false;
          if (active) {
            if (rolename == "admin") {
              moloch_input = {createEnabled: true, enabled: true}
            }
            if (rolename == "read") {
              moloch_input = {enabled: true}
            }
          } else {
            if (rolename == "admin") {
              moloch_input = {createEnabled: false}
            }
            if (rolename == "read") {
              moloch_input = {enabled: false}
            }
          }
          if (moloch_input !== false) {
            moloch_input = {doc: moloch_input};
          }
          hell.o(["moloch input:", moloch_input], "editMolochUser", "info");
          let moloch_update = await user.local_connection.post("http://localhost:9200/arkime_users/_doc/" + username + "/_update/", moloch_input);
          user.local_connection = "";
        }

        user_find = await user.findOne({where: {username: username}});

        hell.o("done", "editMolochUser", "info");
        cb(null, user_find);
      } catch (err) {
        hell.o(err, "editMolochUser", "error");
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };


  user.remoteMethod('editMolochUser', {
    accepts: [
      {arg: 'username', type: 'string', required: true},
      {arg: 'active', type: 'boolean', required: true},
      {arg: 'rolename', type: 'string', required: true},
    ],
    returns: {type: 'object', root: true},
    http: {path: '/editMolochUser', verb: 'post', status: 200}
  });

  user.observe('before delete', function (ctx, next) {
    hell.o("start", "delete", "info");
    // console.log('Going to delete %s matching %j', ctx.Model.pluralModelName, ctx.where );

    (async function () {
      try {

        if (process.env.NODE_ENV == "dev") {
          return next();
        }

        hell.o("username", "delete", "info");
        let user_find = await user.findOne({where: {id: ctx.where.id.inq[0]}});
        hell.o(["user find", user_find], "delete", "info");

        let change_input = shellescape(["htpasswd", "-D", "/etc/nginx/.htpasswd", user_find.username]);
        shelljs.exec(change_input, {silent: true}, function (exit_code, stdout, stderr) {
          hell.o(["shelljs result ", exit_code], "delete", "info");
          if (exit_code != 0) throw new Error(stderr);

          hell.o("done", "updatePassword", "info");
          next();
        });

        let comp = await user.app.models.component.findOne({where: {name: "moloch", installed: true, enabled: true}})
        if (comp && process.env.NODE_ENV != "dev") {
          hell.o("delete from moloch start", "deleteUser", "info");
          user.local_connection = axios.create({});
          user.local_connection.delete("http://localhost:9200/arkime_users/_doc/" + user_find.username);
          user.local_connection = "";
          hell.o("delete from moloch done", "deleteUser", "info");
        }

      } catch (err) {
        hell.o(err, "updatePassword", "error");
        next();
      }

    })(); // async

  });

  /**
   * UPDATE USER PASSWORD
   *
   * change htpasswd
   *
   * @param username
   * @param password
   * @param options
   * @param cb
   */
  user.updatePassword = function (username, password, options, cb) {
    hell.o("start", "updatePassword", "info");
    hell.o(username, "updatePassword", "info");
    // hell.o(password, "updatePassword", "info");

    (async function () {
      try {

        if (process.env.NODE_ENV == "dev") {
          return true;
        }

        let change_input = shellescape(["htpasswd", "-i", "/etc/nginx/.htpasswd", username]);
        let echo_password = shellescape(['printf', '%s', password]);
        shelljs.exec(echo_password, {silent: true}).exec(change_input, {silent: true}, function (exit_code, stdout, stderr) {
          hell.o(["shelljs result ", exit_code], "updatePassword", "info");
          //let message = stderr;
          if (exit_code != 0) throw new Error(stderr);

          hell.o("done", "updatePassword", "info");
          cb(null, {message: "ok"});

        });

      } catch (err) {
        hell.o(err, "updatePassword", "error");
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  user.remoteMethod('updatePassword', {
    accepts: [
      {arg: 'username', type: 'string', required: true},
      {arg: 'password', type: 'string', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/updatePassword', verb: 'post', status: 200}
  });


  /**
   * CHECK IF NO ROLES, REMOVE USER FROM HTPASSWD
   *
   * change htpasswd
   *
   * @param user_id
   */
  user.afterRoleRemove = async function (user_id) {
    hell.o("start", "afterRoleRemove", "info");
    hell.o(["user_id", user_id], "afterRoleRemove", "info");

    try {

      if (process.env.NODE_ENV == "dev") {
        return true;
      }

      let current_user = await user.findOne({where: {id: user_id}});
      let current_roles = await user.app.models.roleMapping.find({where: {principalId: user_id}});

      if (current_roles.length > 0) return true;
      hell.o("No more roles, remove from htpasswd", "afterRoleRemove", "info");

      let change_input = shellescape(["htpasswd", "-D", "/etc/nginx/.htpasswd", current_user.username]);
      hell.o(change_input, "afterRoleRemove", "info");

      shelljs.exec(change_input, {silent: true}, function (exit_code, stdout, stderr) {
        hell.o(["shelljs result ", exit_code], "afterRoleRemove", "info");
        let message = stderr;
        if (exit_code != 0) throw new Error(stderr);

        hell.o("done", "afterRoleRemove", "info");
        // cb(null, {message: "ok"});
        return true;
      });

    } catch (err) {
      hell.o(err, "afterRoleRemove", "error");
      return false;
    }
  };

};
