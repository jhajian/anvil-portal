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
        const conditionsByCode = getConditionsByCode(studies);

        /* Convert the conditions by code into cacheable content. */
        const content = buildCacheContent(conditionsByCode);

        /* If the file does not exist, it will be created. */
        /* See https://nodejs.org/api/fs.html#fs_file_system_flags {"flag": "as+"}. */
        await cacheFile(fileReport, content, {"flag": "as+"});
    }
}

/**
 * Returns cacheable content.
 * Converts each map object into a comma separated string representing a single row.
 *
 * @param conditionsByCode
 * @returns {*}
 */
function buildCacheContent(conditionsByCode) {

    return [...conditionsByCode].reduce((acc, [code, condition]) => {

        /* Make the row. */
        const content = `${code}\t${condition}\r\n`;

        return acc.concat(content);
    }, "")
}

/**
 * Returns map object key-value pair of code and condition.
 *
 * @param studies
 * @returns {*}
 */
function getConditionsByCode(studies) {

    return studies.reduce((acc, study) => {

        study.conditions?.forEach(condition => {

            const {code, display} = condition;
            acc.set(code, display);
        });

        return acc;
    }, new Map());
}

module.exports.dashboardReportConditionCodes = dashboardReportConditionCodes;
