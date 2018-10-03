'use strict';
const elasticsearch = require('elasticsearch');
const hell = new (require(__dirname + "/helper.js"))({module_name: "notify"});

module.exports = function (notify) {

  /**
   * INITIALIZE NOTIFY
   *
   * init elastic client
   *
   * @param input
   * @param cb
   */
  notify.initialize = function (cb) {
    hell.o("start", "initialize", "info");
    (async () => {
      try {
        hell.o("check elastic", "initialize", "info");

        //development, return ok
        if (process.env.NODE_ENV == "dev") {
          hell.o("DEV - elastic client ok", "initialize", "info");
          return cb(null, {message: "ok"});
        }

        let elastic_check = await notify.app.models.component.findOne({where: {name: "elastic", status: true}});
        if (!elastic_check) throw new Error("elastic component status failed");

        notify.es_client = new elasticsearch.Client({
          host: 'localhost:9200',
          //log: 'trace'
        });

        hell.o("elastic client ok", "initialize", "info");

        cb(null, {message: "ok"});
      } catch (err) {
        hell.o(err, "initialize", "error");
        cb({name: "Error", status: 400, message: err});
      }

    })(); // async

  };


};
