/*
 * The AnVIL
 * https://www.anvilproject.org
 *
 * Service for formatting NCPI dashboard studies into FE model.
 */

// Core dependencies
const path = require("path");

// App dependencies
const {parseRows, readFile, splitContentToContentRows} = require(path.resolve(__dirname, "./dashboard-file-system.service.js"));
const {sortDataByDuoTypes} = require(path.resolve(__dirname, "./dashboard-sort.service.js"));
const {getStudyAccession, getStudyUrl} = require(path.resolve(__dirname, "./dashboard-studies-db-gap.service.js"));
const {getFHIRStudy} = require(path.resolve(__dirname, "./dashboard-studies-fhir.service.js"));
const {buildGapId} = require(path.resolve(__dirname, "./dashboard-study.service.js"));

// Template variables
const fileSource = "dashboard-source-ncpi.csv";
const PLATFORM = {
    "ANVIL": "AnVIL",
    "BDC": "BDC",
    "CRDC": "CRDC",
    "GMKF": "GMKF",
    "KFDRC": "KFDRC"
};
const SOURCE_HEADER_KEY = {
    "DB_GAP_ID": "identifier",
    "PLATFORM": "platform",
};
const SOURCE_FIELD_KEY = {
    [SOURCE_HEADER_KEY.DB_GAP_ID]: "dbGapId",
    [SOURCE_HEADER_KEY.PLATFORM]: "platform"
};
const SOURCE_FIELD_TYPE = {
    [SOURCE_HEADER_KEY.DB_GAP_ID]: "string",
    [SOURCE_HEADER_KEY.PLATFORM]: "string"
};

/**
 * Returns the NCPI dashboard studies.
 *
 * @returns {Promise.<void>}
 */
const getNCPIStudies = async function getNCPIStudies() {

    /* Parse the source file. */
    const rows = await parseSource();

    /* Make the studies distinct; some platforms share the same study. */
    const studyPlatforms = getDistinctStudies(rows);

    /* Build the studies dashboard. */
    const studies = await buildDashboardStudies(studyPlatforms);

    /* Return the sorted studies. */
    return sortDataByDuoTypes([...studies], "platform", "studyName");
};

/**
 * Build up FE-compatible model of NCPI dashboard studies, to be displayed on the NCPI dashboard.
 *
 * @param gapIdPlatforms
 * @returns {Promise.<*[]>}
 */
async function buildDashboardStudies(gapIdPlatforms) {

    if ( gapIdPlatforms.length ) {

        /* Build the studies dashboard. */
        return await gapIdPlatforms.reduce(async (promise, gapIdPlatform) => {

            let acc = await promise;

            /* Build the study. */
            const study = await buildDashboardStudy(gapIdPlatform);

            /* Accumulate studies with complete fields (title, subjectsTotal). */
            if ( isStudyFieldsComplete(study) ) {

                acc.push(study);
            }

            return acc;
        }, Promise.resolve([]));
    }

    return [];
}

/**
 * Builds the NCPI dashboard study into a FE-compatible model of a data dashboard study.
 *
 * @returns {Promise.<*>}
 * @param gapIdPlatform
 */
async function buildDashboardStudy(gapIdPlatform) {

    const {dbGapId, platforms} = gapIdPlatform;

    /* Grab the study accession, if it exists. */
    const studyAccession = await getStudyAccession(dbGapId);

    /* Get any study related data from the FHIR JSON. */
    const study = await getFHIRStudy(studyAccession);

    /* Get the db gap study url. */
    const studyUrl = getStudyUrl(studyAccession);

    /* Assemble the study variables. */
    const consentCodes = study.consentCodes;
    const dataTypes = study.dataTypes;
    const diseases = study.diseases;
    const gapId = buildGapId(dbGapId, studyUrl);
    const studyDesigns = study.studyDesigns;
    const studyPlatform = getStudyPlatform(platforms);
    const studyPlatforms = platforms;
    const studyName = study.studyName;
    const subjectsTotal = study.subjectsTotal;

    return {
        consentCodes: consentCodes,
        dataTypes: dataTypes,
        dbGapIdAccession: studyAccession,
        diseases: diseases,
        gapId: gapId,
        platform: studyPlatform,
        platforms: studyPlatforms,
        studyDesigns: studyDesigns,
        studyName: studyName,
        studyUrl: studyUrl,
        subjectsTotal: subjectsTotal
    };
}

/**
 * Returns a distinct list of studies, with corresponding list of platforms (should there be more than one per study),
 * and dbGapIds.
 *
 * @param rows
 */
function getDistinctStudies(rows) {

    return rows.reduce((acc, row) => {

        /* Some platforms share the same study. */
        /* In this instance, we will add the additional platform to the existing study. */
        const {dbGapId} = row;

        /* Accumulate the study (or skip, if it has already been accumulated). */
        if ( !isStudyListed(acc, dbGapId) ) {

            /* Grab the platforms that share the same study. */
            const platforms = getDistinctStudyPlatforms(rows, dbGapId);

            /* Accumulate the study. */
            acc.push({dbGapId: dbGapId, platforms: platforms});
        }

        return acc;
    }, []);
}

/**
 * Returns a list of platforms for the specified study id.
 *
 * @param rows
 * @param studyId
 * @returns {*[]}
 */
function getDistinctStudyPlatforms(rows, studyId) {

    /* Grab a set of platforms that share the same study. */
    const setOfPlatforms = getSetOfStudyPlatforms(rows, studyId)

    /* Sort the platforms by alpha. */
    const platforms = [...setOfPlatforms];
    platforms.sort();

    return platforms;
}

/**
 * Returns the platform display value.
 *
 * @param platform
 * @returns {*}
 */
function getPlatformDisplayValue(platform) {

    if ( platform ) {

        const key = platform.toUpperCase();
        const platformDisplayValue = PLATFORM[key];

        return platformDisplayValue || platform;
    }

    return platform;
}

/**
 * Returns a set of platforms for the specified study id.
 *
 * @param rows
 * @param studyId
 * @returns {Set<any>|*}
 */
function getSetOfStudyPlatforms(rows, studyId) {

    if ( rows ) {

        return rows
            .filter(study => study.dbGapId === studyId)
            .reduce((acc, study) => {

                acc.add(study.platform);
                return acc;
            }, new Set());
    }

    return new Set();
}

/**
 * Returns the platforms array as a string value; using the platform display value.
 *
 * @param platforms
 */
function getStudyPlatform(platforms) {

    return platforms
        .map(platform => getPlatformDisplayValue(platform))
        .join(", ");
}

/**
 * Returns true if the study has a valid study name and subjects total.
 *
 * @param study
 * @returns {*}
 */
function isStudyFieldsComplete(study) {

    return study.studyName && study.subjectsTotal;
}

/**
 * Returns true if the studies has the specified study id.
 *
 * @param studies
 * @param studyId
 * @returns {*}
 */
function isStudyListed(studies, studyId) {

    if ( studies ) {

        return studies.some(study => study.dbGapId === studyId);
    }
}

/**
 * Returns the source into an array, shaped by SOURCE_FIELD_KEY.
 *
 * @returns {Promise.<Array>}
 */
async function parseSource() {

    /* Read NCPI platform dbGapId source. */
    const content = await readFile(fileSource, "utf8");

    /* Split the file content into rows. */
    const contentRows = splitContentToContentRows(content);

    /* Parse and return the ingested data. */
    return parseRows(contentRows, ",", SOURCE_FIELD_KEY, SOURCE_FIELD_TYPE);
}

module.exports.getNCPIStudies = getNCPIStudies;
