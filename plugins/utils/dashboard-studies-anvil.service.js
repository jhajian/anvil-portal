/*
 * The AnVIL
 * https://www.anvilproject.org
 *
 * Service for formatting AnVIL studies into FE model from workspaces data.
 */

// Core dependencies
const path = require("path");

// App dependencies
const {getStudyAccession, getUrlStudy} = require(path.resolve(__dirname, "./dashboard-studies-db-gap.service.js"));
const {getFHIRStudy} = require(path.resolve(__dirname, "./dashboard-studies-fhir.service.js"));

/**
 * Returns a map object of key-value pair study accession, study designs, study name and url by db gap id.
 * @param workspaces
 * @returns {Promise.<*>}
 */
const getStudyPropertiesById = async function getStudyPropertiesById(workspaces) {

    /* Grab the set of study ids. */
    const setOfStudyIds = getSetOfStudyIds(workspaces);

    /* Build the map object key-value pair of studies properties by id. */
    return await [...setOfStudyIds].reduce(async (promise, studyId) => {

        let acc = await promise;

        /* Grab the current study associated with the specified db gap id. */
        const studyAccession = await getStudyAccession(studyId);

        /* Grab the current study's associated study name and url. */
        const studyUrl = getUrlStudy(studyAccession);
        const study = await getFHIRStudy(studyAccession);
        const studyName = study?.studyName;
        const studyDesigns = study?.studyDesigns

        /* Accumulate the db gap id with any corresponding study properties. */
        acc.set(studyId, {
            dbGapIdAccession: studyAccession,
            studyDesigns: studyDesigns,
            studyName: studyName,
            studyUrl: studyUrl});

        return acc;
    }, Promise.resolve(new Map()));
};

/**
 * Returns the set of dbGaP ids.
 *
 * @param workspaces
 * @returns {Set}
 */
function getSetOfStudyIds(workspaces) {

    return new Set(workspaces
        .filter(workspace => workspace.dbGapId && workspace.dbGapId.startsWith("phs"))
        .map(workspace => workspace.dbGapId));
}

module.exports.getStudyPropertiesById = getStudyPropertiesById;
