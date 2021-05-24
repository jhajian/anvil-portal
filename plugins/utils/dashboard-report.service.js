/*
 * The AnVIL
 * https://www.anvilproject.org
 *
 * Service for running reports on dashboard source data.
 */

// Core dependencies
const path = require("path");

// App dependencies
const {cacheFile} = require(path.resolve(__dirname, "./dashboard-file-system.service.js"));

// Template variables
const fileReport = "../../cache-reports/dashboard-report.tsv";

/**
 * Runs a report and outputs to TSV all FHIR condition code and the corresponding condition display value.
 *
 * @param studies
 * @returns {Promise<void>}
 */
const dashboardReportConditionCodes = async function dashboardReportConditionCodes(studies) {

    if ( studies ) {

        /* Grab all conditions by code. */
        const setOfConditionsByCode = getSetOfConditionsByCode(studies);

        /* Convert the conditions by code into cacheable content. */
        const content = buildCacheContent(setOfConditionsByCode);

        /* If the file does not exist, it will be created. */
        /* See https://nodejs.org/api/fs.html#fs_file_system_flags {"flag": "w"}. */
        await cacheFile(fileReport, content, {"flag": "w"});
    }
}

/**
 * Returns cacheable content.
 * Converts each map object into a comma separated string representing a single row.
 *
 * @param setOfconditionsByCode
 * @returns {*}
 */
function buildCacheContent(setOfconditionsByCode) {

    return [...setOfconditionsByCode].reduce((acc, [code, setOfConditions]) => {

        const listOfConditions = [...setOfConditions].join("; ");

        /* Make the row. */
        const content = `${code}\t${listOfConditions}\r\n`;

        return acc.concat(content);
    }, "")
}

/**
 * Returns map object key-value pair of code and set of conditions.
 *
 * @param studies
 * @returns {*}
 */
function getSetOfConditionsByCode(studies) {

    return studies
      .map(study => study?.conditions)
      .reduce((acc, condition) => acc.concat(condition))
      .reduce((acc, condition) => {

        const {code, display} = condition;
        const key = code?.split(" ").shift();

        if ( !acc.has(key) ) {

          const setOfConditions = new Set();
          setOfConditions.add(display);
          acc.set(key, setOfConditions);
        }
        else {

          const setOfConditions = acc.get(key);
          setOfConditions.add(display);
          acc.set(key, setOfConditions);
        }

        return acc;
      }, new Map());
}

module.exports.dashboardReportConditionCodes = dashboardReportConditionCodes;
