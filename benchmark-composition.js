#!/usr/bin/env node

var print = console.log,
    exec = require('child_process').exec;

// Parse arguments
var args = process.argv.splice(2);
var reasoner = args[0] || "eye";
var maxDescriptionCount = parseInt(args[1], 10) || Math.Infinity;

// Configuration
var repeats = 5;
var descriptionCount = 1;

var reasonerOptions = {
  eye: {
    goal: '--query ',
    proof: ''
  },
  cwm: {
    goal: '--think --filter=',
    proof: '--why'
  }
}

// Asynchronous step executor
var results = {};
var steps = [dryRun, nextRound];
executeSteps();

// Execute the next step, measuring its duration
function executeSteps() {
  // Get the next step
  var step = steps.shift();
  if (!step)
    return;
  
  // Get the current results for this step
  var result = results[step.name];
  if (!result)
    results[step.name] = result = [];
  
  // Start the step and measure its duration
  var time = new Date().getTime();
  step(function () {
    // Store the result
    result.push(new Date().getTime() - time);
    // Continue with the next step
    executeSteps();
  });
}


/***
          STEPS
                      ***/


// Generates steps for the next benchmark round
function nextRound(callback) {
  descriptionCount *= 2;
  if (descriptionCount > maxDescriptionCount)
    return;
  
  // Reset the results.
  results = {};

  // Create new steps
  var i;
  steps.push(generateDescriptions);
  for (i = 0; i < repeats; i++)
    steps.push(parseDescriptions);
  for (i = 0; i < repeats; i++)
    steps.push(createComposition);
  for (i = 0; i < repeats; i++)
    steps.push(parseDescriptionsTwoConditions);
  for (i = 0; i < repeats; i++)
    steps.push(createCompositionTwoConditions);
  for (i = 0; i < repeats; i++)
    steps.push(parseDescriptionsThreeConditions);
  for (i = 0; i < repeats; i++)
    steps.push(createCompositionThreeConditions);
  steps.push(printResults);
  steps.push(nextRound);
  
  // Execute the steps
  callback();
}

// Generates `descriptionCount` descriptions
function generateDescriptions(callback) {
  var pending = 3;
  exec('./generate-descriptions.js ' + descriptionCount + ' 1 > /tmp/descriptions1.n3', next);
  exec('./generate-descriptions.js ' + descriptionCount + ' 2 > /tmp/descriptions2.n3', next);
  exec('./generate-descriptions.js ' + descriptionCount + ' 3 > /tmp/descriptions3.n3', next);
  
  function next() {
    if(--pending === 0)
      callback();
  }
}

// Dry reasoner run (to calibrate)
function dryRun(callback) {
  exec(reasoner + ' --help', callback);
}

// Parses `descriptionCount` descriptions
function parseDescriptions(callback) {
  exec(reasoner + ' /tmp/descriptions1.n3', callback);
}

// Creates a composition chain of `descriptionCount` descriptions
function createComposition(callback) {
  exec(reasoner + ' initial.ttl /tmp/descriptions1.n3 '
       + reasonerOptions[reasoner].goal + 'goal.n3 '
       + reasonerOptions[reasoner].proof, callback);
}

// Parses `descriptionCount` descriptions (two conditions)
function parseDescriptionsTwoConditions(callback) {
  exec(reasoner + ' /tmp/descriptions2.n3', callback);
}

// Creates a composition chain of `descriptionCount` descriptions (two conditions)
function createCompositionTwoConditions(callback) {
  exec(reasoner + ' initial.ttl /tmp/descriptions2.n3 '
       + reasonerOptions[reasoner].goal + 'goal.n3 ' +
       + reasonerOptions[reasoner].proof, callback);
}

// Parses `descriptionCount` descriptions (three conditions)
function parseDescriptionsThreeConditions(callback) {
  exec(reasoner + ' /tmp/descriptions3.n3', callback);
}

// Creates a composition chain of `descriptionCount` descriptions (three conditions)
function createCompositionThreeConditions(callback) {
  exec(reasoner + ' initial.ttl /tmp/descriptions3.n3 '
       + reasonerOptions[reasoner].goal + 'goal.n3 '
       + reasonerOptions[reasoner].proof, callback);
}

// Prints the results of a benchmark round
function printResults(callback) {
  print([
      descriptionCount,
      round(avg(results.parseDescriptions)),
      round(avg(results.createComposition)),
      round(avg(results.createComposition) - avg(results.parseDescriptions)),
      round(avg(results.parseDescriptionsTwoConditions)),
      round(avg(results.createCompositionTwoConditions)),
      round(avg(results.createCompositionTwoConditions) - avg(results.parseDescriptionsTwoConditions)),
      round(avg(results.parseDescriptionsThreeConditions)),
      round(avg(results.createCompositionThreeConditions)),
      round(avg(results.createCompositionThreeConditions) - avg(results.parseDescriptionsThreeConditions)),
    ].join('\t'));
  callback();
}

// Returns the average of the values in the array
function avg (values) {
  return values.reduce(function(a,b) { return a + b; }, 0) / values.length;
}

// Rounds the value to exactly one decimal place, converting it to a string
function round(value) {
  return (Math.round(value * 10) + '').replace(/(\d)$/, '.$1');
}
