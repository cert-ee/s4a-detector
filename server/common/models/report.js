'use strict';
const machineId = require('node-machine-id');
const elasticsearch = require('elasticsearch');
const hell = new (require(__dirname + "/helper.js"))({module_name: "report"});

module.exports = function (report) {

  /**
   * INITIALIZE REPORTING
   *
   * init elastic client
   *
   * @param input
   * @param cb
   */
  report.initialize = function (cb) {
    hell.o("start", "initialize", "info");
    (async () => {
      try {
        hell.o("check elastic", "initialize", "info");

        //development, return ok
        if (process.env.NODE_ENV == "dev" ) {
          hell.o("DEV - elastic client ok", "initialize", "info");
          return cb(null, {message: "ok"});
        }

        let elastic_check = await report.app.models.component.findOne({where: {name: "elastic", status: true}});
        if (!elastic_check) throw new Error("elastic component status failed");

        report.es_client = new elasticsearch.Client({
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

  report.status_routine_active = false;
  report.statusRoutine = function (options, cb) {

    hell.o("checking central ( url from env ) : " + process.env.CENTRAL_API_URL, "statusRoutine", "info");

    //check if our registration is approved up
    if (!report.app.models.central.CENTRAL_TOKEN || report.app.models.central.CENTRAL_TOKEN == "invalid") {
      hell.o("no API Key yet", "statusRoutine", "warn");
      report.app.models.central.lastSeen(false);
      return cb({name: "Error", status: 400, message: "no_api_token"});
    }

    if (report.status_routine_active) {
      report.app.models.central.lastSeen(false);
      hell.o("is already running, busy", "statusRoutine", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }
    report.status_routine_active = true;

    (async () => {

      try {
        let component_statuses = await report.app.models.component.find({fields: ["name", "friendly_name", "status", "message"]});

        let output = {};
        output.components = component_statuses;

        hell.o("report status to central", "statusRoutine", "info");
        let result;
        try {
          result = await report.app.models.central.connector().post("/report/status", {detector_info: output});
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }
          throw new Error(out);
        }

        /**
         * IF JOBS / TASKS FROM CENTRAL
         */
        if (result.data && result.data.job_queue && result.data.job_queue.length > 0) {
          hell.o("got some jobs from central", "statusRoutine", "info");
          let job_result, job_queue = result.data.job_queue;
          for (let i = 0, l = job_queue.length; i < l; i++) {

            try {
              job_result = await report.doJob(job_queue[i]);
            } catch (err) {
              let out = "Central API down [ " + err.message + " ]";
              if (err.response && err.response.data
                && err.response.data.error && err.response.data.error.message) {
                out = err.response.data.error.message;
              }
              throw new Error(out);
            }

          }

        }

        await report.app.models.central.lastSeen(true);
        report.status_routine_active = false;
        hell.o("done", "statusRoutine", "info");
        cb(null, {message: "ok"});
      } catch (err) {
        report.status_routine_active = false;
        await report.app.models.central.lastSeen(false);
        hell.o(err, "statusRoutine", "error");

        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  report.remoteMethod('statusRoutine', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/statusRoutine', verb: 'get', status: 200}
  });


  /**
   * CENTRAL JOB / TASK
   *
   * do it
   *
   * @param job
   * @returns {Promise}
   */
  report.doJob = function (job) {
    hell.o("start", "doJob", "info");
    hell.o(job, "doJob", "info");

    return new Promise((success, reject) => {

      (async function () {

        try {
          let result;
          switch (job.name) {

            case "registrationApproved":
              result = await report.app.models.registration.registrationApproved();
              if (!result) throw new Error("registrationApproved failed");
              break;
            case "registrationRejected":
              result = await report.app.models.registration.registrationRejected();
              if (!result) throw new Error("registrationRejected failed");
              break;
            default:
              hell.o(["there was no matching job", job], "doJob", "error");
              reject(false);
              break;
          }

          result = await report.jobDone(job);
          if (!result) throw new Error("jobDone failed");
          success(true);
        } catch (err) {
          hell.o(err, "doJob", "error");
          reject(err);
        }

      })(); // async

    }); // promise

  };

  /**
   * CENTRAL JOB / TASK DONE
   *
   * @param input
   * @returns {Promise}
   */
  report.jobDone = function (input) {
    hell.o("start", "jobDone", "info");
    hell.o(input, "jobDone", "info");

    return new Promise((success, error) => {

      report.app.models.central.connector().post("/report/jobDone", input
      ).then(result => {
        hell.o(result.data, "jobDone", "info");
        success(result);
      }).catch(err => {
        hell.o(err, "jobDone", "error");
        error(err);
      });

    }); // promise

  };

  /**
   * GET ALERTS FROM ELASTIC SEARCH
   *
   * @param input
   * @returns {Promise}
   */
  report.checkAlerts = function (input) {
    hell.o("start", "checkAlerts", "info");

    return new Promise((success, reject) => {

      (async () => {

        let elastic_check = await report.app.models.component.findOne({where: {name: "elastic", status: true}});
        if (!elastic_check){
          hell.o("elastic status failed", "checkAlerts", "info");
          reject("elastic component status failed");
          return;
        }

        let entry_ptr = input.alerts_pointer;
        hell.o("pointer " + entry_ptr, "checkAlerts", "info");

        let elastic_params = {index: "logstash*", body: {}};

        let settings = await report.app.models.settings.findOne();

        //if alert info level is limited
        if (!settings.alerts_info_level_all) {
          //hell.o("settings.alerts_info_level_all == false", "checkAlerts", "info");
          elastic_params.body["_source"] = ["_id", "alert", "event_type", "flow_id", "in_iface", "proto", "timestamp"];
        }

        if( entry_ptr === undefined || entry_ptr == "empty" ) {
          hell.o("alerts pointer empty, go back one month", "checkAlerts", "info");
          let d = new Date();
          d.setMonth(d.getMonth() - 1);
          entry_ptr = d.toISOString();
          hell.o("alerts pointer now" + entry_ptr, "checkAlerts", "info");
        }

        elastic_params.body.query = {
          bool: {
            "must": [
              {range: {"timestamp": {"gt": "" + entry_ptr}}}
              ,{ "term" : { "event_type": "alert" }}
            ]
          }
        };

        if (!settings.alerts_severity_all) {
          //hell.o("settings.alerts_severity_all == false", "checkAlerts", "info");
          elastic_params.body.query.bool.must.push = {term: {"alert.severity": 1}};
        }

        elastic_params.body.size = 100;

        hell.o("elastic call", "checkAlerts", "info");
        hell.o( JSON.stringify( elastic_params ) , "checkAlerts", "info");

        report.es_client.search(elastic_params).then(function (body) {
          hell.o("elastic result", "checkAlerts", "info");
          let hits = body.hits.hits;
          let result = {};
          let counter = 0;

          // hell.o(hits, "checkAlerts", "info");

          for (var id = 0,l = hits.length; id < l; id++) {
            result = hits[id]._source;
            //if alert info level is limited, but fill ip fields for evebox
            if (!settings.alerts_info_level_all) {
              hits[id]._source['src_ip'] = "0.0.0.0";
              hits[id]._source['dest_ip'] = "0.0.0.0";
            }
            //console.log("alerts: " + id );
            //console.log( hits[id] );
            //console.log( result['timestamp'] );
            if( result['timestamp'] !== undefined && Date.parse(result['timestamp'] ) ){ //if date format
              entry_ptr = result['timestamp'];
              counter++;
            }
          }

          if( counter == 0 ) hits = [];

          hell.o("done: " + counter, "checkAlerts", "info");
          success({alerts_pointer: entry_ptr, alerts: hits});

        }).catch(function (e) {
          hell.o(e, "checkAlerts", "error");
          reject(e);

        }, function (error) {
          hell.o(error, "checkAlerts", "error");
          reject(error);

        }); //elastic call

      })();//async

    }); //promise

  };


  /**
   * ALERTS ROUTINE
   *
   * check if new alarms
   * post to central
   * update alarms pointer
   *
   * @param cb
   */
  report.alerts_routine_active = false;
  report.alertsRoutine = function (option, cb) {
    hell.o("start", "alertsRoutine", "info");

    if (!report.app.models.central.CENTRAL_ACTIVATED) {
      hell.o("central is not activated yet, return", "alertsRoutine", "warn");
      return cb({name: "Error", status: 400, message: "not_approved"});
    }

    if (report.alerts_routine_active) {
      hell.o("is already running, busy", "alertsRoutine", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }

    report.alerts_routine_active = true;

    (async function () {
      try {

        let reporting = await report.findOne({id: "reportid"});
        if (!reporting) {
          await report.create({id: "reportid"});
          reporting = await report.findOne({id: "reportid"});
        }

        //update dashboard alerts sent counter if day changes
        let current_day_number = (new Date()).getDay(), reporting_input;
        if( reporting.alerts_sent_day != current_day_number ){
          hell.o([ "reporting day number", reporting.alerts_sent_day ], "alertsRoutine", "info");
          hell.o([ "current day number", current_day_number ], "alertsRoutine", "info");

          reporting_input = {
            alerts_sent_today: 0,
            alerts_sent_day: current_day_number
          };

          await report.update( {id: "reportid"}, reporting_input );

        }

        hell.o("check for alerts from elastic", "alertsRoutine", "info");
        let alerts_checked = await report.checkAlerts({alerts_pointer: reporting.alerts_pointer});
        if (!alerts_checked) throw new Error("load_failed");

        let alert_count_to_send = alerts_checked.alerts.length;
        if (alert_count_to_send == 0) { //nothing to send
          hell.o("done, no alerts to send", "alertsRoutine", "info");
          report.alerts_routine_active = false;
          await report.app.models.central.lastSeen(null, "alerts");
          return cb(null, {message: "ok"});
        }

        /**
         send to central
         */
        hell.o("post to central: " + alert_count_to_send, "alertsRoutine", "info");
        let central_input = {alerts: alerts_checked.alerts};
        let post_to_central;

        try {
          post_to_central = await report.app.models.central.connector().post("/report/alerts", central_input);
        } catch (err) {
          hell.o("post to central failed", "alertsRoutine", "error");

          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        hell.o("going to check alarm pointer: " + alerts_checked.alerts_pointer, "alertsRoutine", "info");
        if( alerts_checked.alerts_pointer !== undefined && Date.parse( alerts_checked.alerts_pointer ) ) { //if date format
          hell.o("update alarm pointer: " + alerts_checked.alerts_pointer, "alertsRoutine", "info");
          hell.o("update alerts sent: " + (reporting.alerts_sent_today + alert_count_to_send), "alertsRoutine", "info");
          hell.o("update alerts sent today: " + ( reporting.alerts_sent_today + alert_count_to_send ), "alertsRoutine", "info");

          reporting_input = {
            alerts_pointer: alerts_checked.alerts_pointer,
            alerts_sent_total: parseInt( reporting.alerts_sent_total ) + alert_count_to_send,
            alerts_sent_today: parseInt( reporting.alerts_sent_today ) + alert_count_to_send
          };

          let updated_pointer = await report.update({id: "reportid"}, reporting_input );
          if (!updated_pointer) throw new Error("alerts_pointer_save_failed");
        } else {
          hell.o("malformed alarm pointer: " + alerts_checked.alerts_pointer, "alertsRoutine", "error");
        }

        report.alerts_routine_active = false;
        hell.o("done", "alertsRoutine", "info");

        await report.app.models.central.lastSeen(true, "alerts", true);

        cb(null, {message: "ok"});

      } catch (err) {
        hell.o(err, "alertsRoutine", "error");
        report.alerts_routine_active = false;
        await report.app.models.central.lastSeen(null, "alerts", false);
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  report.remoteMethod('alertsRoutine', {
    accepts: [
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/alertsRoutine', verb: 'get', status: 200}
  });

  /**
   * MANUAL ALERTS
   *
   * feature not implemented yet
   *
   * @param alerts
   * @param options
   * @param cb
   */
  report.checking_manual = false;
  report.alertsManual = function (alerts, options, cb) {
    hell.o("start", "alertsManual", "info");

    if( process.env.NODE_ENV !== "dev" ) {
      hell.o("ENV is not DEV, fail", "alertsManual", "warn");
      cb("error");
      return false;
    }

    if (report.checking_manual) {
      hell.o("is already running, busy", "alertsManual", "warn");
      return cb({name: "Error", status: 400, message: "worker_busy"});
    }

    report.checking_manual = true;

    (async function () {
      try {

        hell.o("post to central", "alertsManual", "info");
        let central_input = {alerts: alerts};
        let post_to_central;
        try {
          post_to_central = await report.app.models.central.connector().post("/report/alertsManual", central_input);
        } catch (err) {

          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        await report.app.models.central.lastSeen(true, "alerts", true);

        report.checking_manual = false;
        cb(null, {message: "done", data: post_to_central.data});

      } catch (err) {
        hell.o(err, "alertsManual", "error");
        await report.app.models.central.lastSeen(null, "alerts", false);
        report.checking_manual = false;
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); //async

  };

  report.remoteMethod('alertsManual', {
    accepts: [
      {arg: 'alerts', type: 'array', required: true},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/alertsManual', verb: 'post', status: 200}
  });


  /**
   * FEEDBACK HANDLER
   *
   * also used by installer scripts
   *
   * @param message
   * @param comment
   * @param machine_id
   * @param detector_logs
   * @param system_info
   * @param network_interfaces
   * @param components
   * @param contacts
   * @param extra
   * @param options
   * @param cb
   */
  report.feedback = function (message, comment, machine_id, detector_logs, system_info, network_interfaces, components,
                              contacts, extra, options, cb) {
    hell.o("start", "feedback", "info");

    (async function () {
      try {

        if( machine_id === undefined || machine_id == "" ){
          let reg_info = await report.app.models.registration.find();
          if( reg_info.length > 0 ){
            machine_id = reg_info[0].machine_id;
          } else {
            machine_id = machineId.machineIdSync();
          }
        }

        if ( ! network_interfaces ) network_interfaces = [];
        if ( ! components ) components = [];

        let feedback_input = {
          message: message,
          comment: comment,
          machine_id: machine_id,
          logs: detector_logs,
          system_info: system_info,
          network_interfaces: network_interfaces,
          components: components,
          contacts: contacts,
          extra: extra
        };

        hell.o( [ "post to central", feedback_input ] , "feedback", "info");
        let post_to_central;
        try {
          post_to_central = await report.app.models.central.connector().post("/report/feedback", feedback_input);
        } catch (err) {
          let out = "Central API down [ " + err.message + " ]";
          if (err.response && err.response.data
            && err.response.data.error && err.response.data.error.message) {
            out = err.response.data.error.message;
          }

          throw new Error(out);
        }

        hell.o("post to central result", "feedback", "info");
        hell.o(post_to_central.data, "feedback", "info");
        await report.app.models.central.lastSeen(true);

        cb(null, {message: "ok", central_response: post_to_central.data});
      } catch (err) {
        hell.o(err, "feedback", "error");
        await report.app.models.central.lastSeen(false);
        cb({name: "Error", status: 400, message: err.message});
      }

    })(); // async

  };

  //REPORT FEEDBACK
  report.remoteMethod('feedback', {
    accepts: [
      {arg: 'message', type: 'string', required: true},
      {arg: 'comment', type: 'string', required: false},
      {arg: 'machine_id', type: 'string', required: false},
      {arg: 'logs', type: 'object', required: false},
      {arg: 'system_info', type: 'object', required: false},
      {arg: 'network_interfaces', type: 'array', required: false},
      {arg: 'components', type: 'array', required: false},
      {arg: 'contacts', type: 'object', required: false},
      {arg: 'extra', type: 'object', required: false},
      {arg: "options", type: "object", http: "optionsFromRequest"}
    ],
    returns: {type: 'object', root: true},
    http: {path: '/feedback', verb: 'post', status: 200}
  });

};
