const dutTests = require('./dutTests.js');
const consumerHostTests = require('./consumerSystemTests.js');

describe('Global: Setup', () => {
    dutTests.setup();
    consumerHostTests.setup();
});

describe('Global: Test', () => {
    dutTests.test();
    consumerHostTests.test();
});

describe('Global: Teardown', () => {
    dutTests.teardown();
    consumerHostTests.teardown();
});
