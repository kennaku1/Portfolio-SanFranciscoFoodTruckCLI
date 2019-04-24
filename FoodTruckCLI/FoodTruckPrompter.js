const getFoodTruckService = require('./FoodTruckService.js');
const prompts = require('prompts');
const executePrompt = `
Type "quit" or "q" to leave
You can begin displaying results by typing "run" and pressing enter
Optional:
You can modify the results by appending the following query parameters to your "run" command 
-sortBy
-isOpen
-batchSize

Example: Note that parameters are comma seprated.

"run -sortBy=starttime,-isOpen=false,batchSize=25"
After you execute the "run" command you can press the Escape Key or "q" at anytime to quit the application or press the up and down arrows to navigate to different pages.
`;

const additionalOptionsPrompt = `Press the "m" key for more options or press the up and down arrow keys to change page`;

const invalidPromptError = `Invalid Prompt(s)!`;
const validCommandOptions = new Set(['-sortBy', '-isOpen', '-batchSize']);
 
class FoodTruckPrompter {
	constructor() {
		this.foodTruckService = null;
		this.commands = null;
	}

	async init() {
		let response = await prompts({
		    type: 'text',
		    name: 'command',
		    message: executePrompt
		});

		this.validateCommand(response.command);
	}

	validateCommand(command) {
		let parseResult = parseCommand(command.replace(/run/,''));
		if (parseResult.hasError) {
			this.throwSearchError(parseResult.invalidParams);
			return;
		}
		this.initSearch(parseResult.results);
	}

	initSearch(command) {
		this.foodTruckService = getFoodTruckService(command.isOpen, command.batchSize, command.sortBy);
		this.foodTruckService.init().then(res => {
			console.log(JSON.stringify(res, null, 2));
			console.log(additionalOptionsPrompt);
			this.initContinousPrompts();
		})
	}

	throwSearchError(invalidParams) {
		console.log(`${invalidPromptError}: ${invalidParams.join(',')}`);
	}

	initContinousPrompts() {
		console.log('continous prompts');
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('keypress',async (str, key) => {
			console.log(str,key);
		  if (key.name === 'q' || key.name === 'escape') {
		    process.exit();
		  } else if (key.name === 'up') {
		  	console.log('Previous page')
		  	this.foodTruckService.currentPage--;
		  	console.log(this.foodTruckService.currentPage);
		  } else if (key.name === 'down') {
		  	console.log('Next page');
		  	let res = await this.foodTruckService.next();
		  	console.log(res);
		  }
		});
	}

	initNavigationEvents() {

	}

	closeEvents() {

	}
}

function parseCommand(command) {
	let results = {};
	let invalidParams = [];
	for(let option of command.trim().split(',')) {
		if (!option) continue;
		let parsedOption = option.split('=');
		if (validCommandOptions.has(parsedOption[0])) results[parsedOption[0].replace(/-/g,'')] = parsedOption[1];
		else invalidParams.push(parsedOption[0]);
	}

	return {
		results: results,
		invalidParams: invalidParams,
		hasError: invalidParams && invalidParams.length > 0
	};
}

module.exports = () => {
	return new FoodTruckPrompter();
};