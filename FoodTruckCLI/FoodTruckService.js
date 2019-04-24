const request = require('request');

const foodTruckEndpoint = 'https://data.sfgov.org/resource/bbb8-hzi6.json';
const NO_RESULTS_CONST = 'No results found';
const RESTRICTED_FIELDS = new Set(['params', 'results', '_currentPage', 'isFinished']);


class FoodTruckService {
	constructor(initialParams = {}) {
		//Params will contain no more than 5 parameters
		this.params = initialParams;
		//A given searchResult index has a list size of n which is defined by the limit parameter.
		this.searchResults = {};
		this._currentPage = 0;
		this.hasStarted = false;
		this.isFinished = false;
	}

	async init() {
		//Already initiated
		if (this.hasStarted) return;
		this.hasStarted = true;
		return await this.getResults();
	}

	async next() {
		if (!this.hasStarted) return;
		return await this.getResults();
	}
	//Easy wasy to get previously Cached pages.
	get currentPage() {
		if (this.isFinished || !this.searchResults) return NO_RESULTS_CONST;
		return this.searchResults[this._currentPage];
	}

	set currentPage(n = 0) {
		if (!this.searchResults[n]) return;
		this._currentPage = n;
	}

	//Returns JSON formatted string of query parameters. 
	getQuery() {
		return this.params.toJSON();
	}

	getResults() {
		return new Promise((resolve, reject) => {
			if (this.isFinished) resolve(this.currentPage);
			let endpoint = `${foodTruckEndpoint}?${this.getQuery()}`;
			console.log('final endpoint', endpoint);
			request(endpoint, (error, response, body) => {
				
				this.searchResults[this._currentPage] = this.parseResult(JSON.parse(body));
				this.currentPage++;
				this.analyzeResults(body);
				resolve(this.currentPage);
			});
		});
	}

	parseResult(results) {
		if (!results) return [];
		console.log(typeof results);
		return results.map(record => {
			return { locationid: record.locationid, 
				starttime: record.starttime, 
				endtime: record.endtime, 
				optionaltext: record.optionaltext, 
				applicant: record.applicant, 
				location: record.location
			};
		});
	}

	addParameters(params = {}, clearCache = true) {
		//If search parameters change we can assume that the existing cache is no longer relevale
		if (clearCache) this.resetCache();
		Object.assign(this.parameters, params);

	}

	analyzeResults(results) {
		if (!results || results.length < this.params.$limit) {
			this.isFinished = true;
			return;
		}
		this.params.incrementPage();
	}

	resetCache() {
		this.searchResults = {};
		this._currentPage = 0;
	}
}


class FoodTruckQueryParameters {
	constructor(isOpen = true, sortBy = 'applicant', batchSize = 10, offset = 0, fields = []) {
		const currentTime = convertTimeToHourFormat(new Date());
		this.endtime = isOpen ? `endtime>="${currentTime}"` : `endtime>"${currentTime}"`;
		this.starttime = isOpen ? `starttime<="${currentTime}"` : `starttime<"${currentTime}"`;
		this.$order = sortBy;
		this.$limit = batchSize;
		this.$offset = offset;
		if (fields && fields.length > 0) this.$select = fields.join(',');
	}

	incrementPage() {
		this.$offset++;
	}

	set limit(val) {
		if (!val) return;
		this.$limit = val;
	}

	toJSON() {
		let timeRange = `${this.starttime}%20AND%20${this.endtime}`;
		let where = paramToString('$where', timeRange, true);

		return where + [paramToString('$order', this.$order, false), paramToString('$limit', this.$limit, false), paramToString('$offset', this.$offset, false)].join('').trim();
	}
}

function convertTimeToHourFormat(time) {
	let hours = time.getHours();
	return hours <= 12 ? `${hours}AM` : `${hours - 12}PM`;
}

function paramToString(name, value, isFirst = false) {
	return isFirst ? `${name}=${value}` : `&${name}=${value}`;
}

module.exports = (isOpen = true, batchSize = 10, sortBy = 'applicant', offset = 0, fields = []) => {
	let queryParams = new FoodTruckQueryParameters(isOpen, sortBy, batchSize, offset, fields);
	return new FoodTruckService(queryParams);
}