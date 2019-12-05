import fetch from "../util/fetch-fill";
import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";

/** Default values */
const defaults = {
    colors: ["red", "brown", "blue", "yellow", "green"],
    limit: 10
};

/**
 * Requests data from the /records endpoint, returns transformed formatted results.
 * @param {Object} options - Specify colors to search and page number 
 * @param {number} options.page - Page number to get records from
 * @param {Array} options.colors - Colors to search
 * @return {Promise<Object>} A promise for the requested colors formatted. See
 * formatFinal documentation for format.
 */
const retrieve = (options = {}) => {
    const url = buildUrl(window.path, options).toString();

    return getRecords(url)
        .then((records = []) => {
            return retrievePromise({
                curPage: (options.page || 1),
                limit: defaults.limit,
                records
            });
        })
        .catch((error) => {
            console.log(`An error occurred during the request. ${error}`);
        });
}

/**
 * Calculates the offset based on the page number and number of records per page.
 * @param {number} page - Page number.
 * @param {number} limit - Number of records per page.
 * @return {number} Offset to use to return correct records based on the page. 
 */
const calcOffset = function calculateOffset(page = 1, limit = defaults.limit) {
    return (page - 1) * limit;
};

// Returns an object of query params and values
/**
 * Builds query params based off of the provided options. Will set record limit
 * 1 more than number of records per page to help determine if there are additional
 * records without performing additional query.
 * @param {Object} obj - Options to build query params.
 * @param {number} obj.limit - Query limit. Use to determine offset
 * @param {Array} obj.colors - Query colors.
 * @param {number} obj.page - Page records should come from. Use to determine offset.
 * @return {{"colors[]": Array, offest: number, limit: number}} Endpoint params
 */
const buildUrlOpts = function buildUrlQueryOptions({
    limit = defaults.limit,
    colors = defaults.colors,
    page = 1
}) {
    return {
        "color[]": colors,
        offset: calcOffset(page, limit),
        limit: limit + 1
    };
};

/**
 * Calculates the offset based on the page number and number of records per page.
 * @param {string} baseUri - Full endpoint.
 * @param {Object} options - See buildUrlOpts params documentation.
 * @return {Object} Return URI object with query params. 
 */
const buildUrl = function buildUrlFromOptions(url, options) {
    return new URI(url).setSearch(buildUrlOpts(options));
};

/**
 * Determines if color is a primary color.
 * @param {string} color - Color to check.
 * @return {bool} True if primary color. 
 */
const isPrimeColor = function isPrimaryColor(color) {
    return ["red", "blue", "yellow"].indexOf(color) !== -1;
};

/**
 * Checks response status. Necessary to handle Fetch repsonse behavior.
 * @param {Array} records - Response records.
 * @return {Promise<Array>} If success, a Promise of parsed response as
 * JSON. If error, throws Error object with the status text. 
 */
const verifyStatus = function verifyResponseStatus(response) {
    const { status, statusText } = response;

    if (status >= 200 && status < 300) {
        return response.json();
    } else {
        throw Error(statusText);
    }
};

/**
 * Sends request to endpoint.
 * @param {string} url - Request url.
 * @return {Promise<Array>|Object} Promise of parsed response as JSON.
 */
const getRecords = function getDataRecords(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
        .then(verifyStatus)
        .then((records = []) => {
            resolve(records);
        })
        .catch((error) => {
            reject(error);
        });    
    });
};

/**
 * Get response record ids.
 * @param {Array} records - Response records.
 * @return {Array<number>} Record ids. 
 */
const getIds = function getRecordIds(records) {
    return records.map((record) => (record.id));
};

/**
 * Return response records that have disposition property value of "open" and adds
 * a key of "isPrimary" with boolean value representing if the record color is
 * primary.
 * @param {Array} records - Response records.
 * @return {Array<Object>} Records with "open" disposition. 
 */
const filterOpenRecs = function filterOpenRecords(records) {
    return records.reduce((open, record) => {
        const { disposition, color } = record;
        if (disposition === "open") {
            record.isPrimary = isPrimeColor(color);
            open.push(record);
        }
        return open;
    }, []);
};

/**
 * Return response records that have disposition property value of "closed" that
 * is also a primary color.
 * @param {Array} records - Response records.
 * @return {Array<Object>} Records with "closed" disposition that are primary colors. 
 */
const getClosedPrime = function filterClosedAndPrimaryRecords(records) {
    return records.filter((record) => {
        const { disposition, color } = record;
        return disposition === "closed" && isPrimeColor(color);
    });
};

/**
 * Formats response records into final format. Function expects records array
 * to contain 1 record more than the limit to determine if there is a next page
 * without making an additional request.
 * @param {Object} obj - Options to format return object.
 * @param {number} obj.curPage - Current page.
 * @param {number} obj.limit - Number of records per page.
 * @param {Array<Object>} obj.records - Response records.
 * @return {{ids: Array, open: Array, closedPrimaryCount: number, previousPage: number, nextPage: number}} A promise for the requested colors formatted as: 
 */
const formatFinal = function formatFinalResult({
    curPage,
    limit = defaults.limit,
    records = []
}) {
    const previousPage = curPage === 1 ? null : curPage - 1;
    const nextPage = (records.length <= limit) ? null : curPage + 1;
    const finalRecs = records.slice(0, limit);

    return {
        ids: getIds(finalRecs),
        open: filterOpenRecs(finalRecs),
        closedPrimaryCount: getClosedPrime(finalRecs).length,
        previousPage: previousPage,
        nextPage: nextPage
    };
};

/**
 * Creates a promise of final formatted data from the /records endpoint.
 * @param {Object} formatOpts - Options for formatFinal function.
 * @return {Promise<Object>} A promise for the requested colors formatted. See
 * formatFinal documentation for format.
 */
const retrievePromise = function createRetrievePromise(formatOpts) {
    return new Promise((resolve, reject) => {
        try {
            resolve(formatFinal(formatOpts));
        } catch (error) {
            reject(error);
        }
    });
};

export default retrieve;