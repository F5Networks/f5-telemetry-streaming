// custom test suite configuration for functional tests
module.exports = {
    retries: 30,
    slow: 1000 * 60 * 3, // increase limit before test is marked as "slow"
    timeout: 1000 * 60 * 5 // longer timeout
}