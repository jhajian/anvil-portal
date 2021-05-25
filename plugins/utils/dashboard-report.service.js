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
        const setOfConditionsBySystemByCode = getSetOfConditionsBySystemsByCode(studies);

        /* Convert the conditions by code into cacheable content. */
        const content = buildCacheContent(setOfConditionsBySystemByCode);

        /* If the file does not exist, it will be created. */
        /* See https://nodejs.org/api/fs.html#fs_file_system_flags {"flag": "w"}. */
        await cacheFile(fileReport, content, {"flag": "w"});
    }
}

/**
 * Returns cacheable content.
 * Converts each map object into a comma separated string representing a single row.
 *
 * @param setOfConditionsBySystemByCode
 * @returns {*}
 */
function buildCacheContent(setOfConditionsBySystemByCode) {

    return [...setOfConditionsBySystemByCode].reduce((acc, [code, setOfConditionsBySystems]) => {

        /* Make the row. */
        const content = [...setOfConditionsBySystems].reduce((acc, [system, setOfConditions]) => {

            /* Join the set of conditions. */
            const listOfConditions = [...setOfConditions].join("; ");

            return acc.concat(`${code}\t${system}\t${listOfConditions}\r\n`);
        }, "");

        return acc.concat(content);
    }, "")
}

/**
 * Returns map object key-value pair of code and (map object key-value pair of) systems by set of conditions.
 *
 * @param studies
 * @returns {*}
 */
function getSetOfConditionsBySystemsByCode(studies) {

    return studies
      .map(study => study?.conditions)
      .reduce((acc, condition) => acc.concat(condition))
      .reduce((acc, condition) => {

          const {code, display, system} = condition;
          const key = code?.split(" ").shift();

          /* Grab the set of displays by system for the specified code. */
          const setOfDisplaysBySystem = acc.get(key);

          /* Update the set of displays by system . */
          const value = getSetOfDisplaysBySystem(key, display, system, setOfDisplaysBySystem);
          acc.set(key, value);

          return acc;
      }, new Map());
}

/**
 * Returns the map object key-value pair of system and set of displays.
 *
 * @param key
 * @param display
 * @param system
 * @param setOfDisplaysBySystem
 * @returns {Map<any, any>}
 */
function getSetOfDisplaysBySystem(key, display, system, setOfDisplaysBySystem = new Map()) {

    if ( setOfDisplaysBySystem.has(system) ) {

        const setOfDisplays = setOfDisplaysBySystem.get(system);
        setOfDisplays.add(display);
        setOfDisplaysBySystem.set(system, setOfDisplays);
    }
    else {

        const setOfDisplays = new Set();
        setOfDisplays.add(display);
        setOfDisplaysBySystem.set(system, setOfDisplays);
    }

    return setOfDisplaysBySystem;
}

module.exports.dashboardReportConditionCodes = dashboardReportConditionCodes;
