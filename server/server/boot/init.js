'use strict';

const util = require('util');
const hell = new (require(__dirname + "/../../common/models/helper.js"))({module_name: "init"});

module.exports = function (app) {
  hell.o("start", "load", "info");
  (async () => {
    try {

      await app.models.boot.initialize();
      await app.models.wise.initialize();
      await app.models.yara.initialize();

      await app.models.report.initialize;

      const load_central = util.promisify(app.models.central.initialize);
      const load_components = util.promisify(app.models.component.initialize);
      const load_rulesets = util.promisify(app.models.ruleset.initialize);
      const load_settings = util.promisify(app.models.settings.initialize);
      const load_notify = util.promisify(app.models.notify.initialize);
      const load_report = util.promisify(app.models.report.initialize);

      hell.o("central", "load", "info");
      let central_result = await load_central();
      if (!central_result) throw new Error("failed to load central");

      hell.o("components", "load", "info");
      let components_result = await load_components();
      if (!components_result) throw new Error("failed to load components");

      hell.o("rulesets", "load", "info");
      let rulesets_result = await load_rulesets();
      if (!rulesets_result) throw new Error("failed to load rulesets");

      hell.o("settings", "load", "info");
      let settings_result = await load_settings();
      if (!settings_result) throw new Error("failed to load settings");
      let settings = await app.models.settings;

      hell.o("notify", "load", "info");
      try {
        let notify_result = await load_notify();
        if (!notify_result) throw new Error("failed to load notify module");
      } catch (e) {
        hell.o("elastic failed", "load", "info");
      }

      hell.o("report", "load", "info");
      try {
        let report_result = await load_report();
        if (!report_result) throw new Error("failed to load report module");
      } catch (e) {
        hell.o("elastic failed", "load", "info");
      }

      hell.o("initialize the intervals for checks", "load", "info");

      // await app.models.rule.checkRoutinePromise({full_check: true});

      /*
      INTERVAL FORMAT
      */
      app.check_interval_format = function (minutes, job_name) {
        hell.o("check_interval_format", "load", "info");
        if (minutes === undefined) minutes = 1;

        let schedule_rule = minutes * 60000;

        if (process.env.NODE_ENV == "dev") { //dev, tick faster
          schedule_rule = 30000;
        }

        // if (job_name == "job_interval_rules_check") {
        //   schedule_rule = 10000;
        // }
        //
        // if (job_name == "job_interval_yara_check") {
        //   schedule_rule = 30000;
        // }
        //
        // if (job_name == "job_interval_wise_check") {
        //   schedule_rule = 30000;
        // }

        hell.o([job_name + " current ms:", schedule_rule], "load", "info");
        return schedule_rule;
      };

      /*
      SCHEDULE CENTRAL / STATUS CHECKING
       */
      hell.o("schedule central / status checker", "init", "info");

      (function interval_status() {
        setTimeout(() => {
          app.models.report.statusRoutine(null, () => {
            interval_status();
          });
        }, app.check_interval_format(settings.job_interval_status_check, "job_interval_status_check"));
      })();

      /*
      SCHEDULE COMPONENTS CHECKING
       */
      hell.o("schedule components checker", "init", "info");

      (function interval_components() {
        setTimeout(() => {
          app.models.component.checkRoutine(null, () => {
            interval_components();
          });
        }, app.check_interval_format(settings.job_interval_components_check, "job_interval_components_check"));
      })();

      /*
      SCHEDULE RULES CHECKING
       */
      hell.o("schedule rules checker", "init", "info");

      (function interval_rules() {
        setTimeout(() => {
          app.models.rule.checkRoutine(null, () => {
            interval_rules();
          });
        }, app.check_interval_format(settings.job_interval_rules_check, "job_interval_rules_check"));
      })();

      /*
      SCHEDULE YARA CHECKING
       */
      hell.o("schedule yara checker", "init", "info");

      (function interval_yara() {
        setTimeout(() => {
          app.models.yara.checkRoutine(null, () => {
            interval_yara();
          });
        }, app.check_interval_format(settings.job_interval_rules_check, "job_interval_yara_check"));
      })();

      /*
      SCHEDULE WISE CHECKING
       */
      hell.o("schedule wise checker", "init", "info");

      (function interval_wise() {
        setTimeout(() => {
          app.models.wise.checkRoutine(null, () => {
            interval_wise();
          });
        }, app.check_interval_format(settings.job_interval_rules_check, "job_interval_wise_check"));
      })();

      /*
      SCHEDULE ALERTS CHECKING
       */
      hell.o("schedule alerts checker", "init", "info");

      (function interval_alerts() {
        setTimeout(() => {
          app.models.report.alertsRoutine(null, () => {
            interval_alerts();
          });
        }, app.check_interval_format(settings.job_interval_alerts_check, "job_interval_alerts_check"));
        // }, 1000);
      })();

      /*
      SCHEDULE NOTIFICATIONS
      */
      hell.o("schedule notifier", "init", "info");

      (function interval_notify() {
        setTimeout(() => {
          app.models.notify.notifyRoutine(null, () => {
            interval_notify();
          });
        }, app.check_interval_format(settings.job_interval_notify_check, "job_interval_notify_check"));
        // }, 1000);
      })();

    }
    catch (err) {
      hell.o(err, "load", "error");
    }
  })();
};
