/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const constants = require('../../src/nodejs/constants.js');

/* eslint-disable global-require */

describe('Util', () => {
    let util;
    let request;

    const setupRequestMock = (res, body, mockOpts) => {
        mockOpts = mockOpts || {};
        ['get', 'post', 'delete'].forEach((method) => {
            request[method] = (opts, cb) => {
                cb(mockOpts.err, res, mockOpts.toJSON === false ? body : JSON.stringify(body));
            };
        });
    };

    before(() => {
        util = require('../../src/nodejs/util.js');
        request = require('request');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should stringify object', () => {
        const obj = {
            foo: 'bar'
        };
        const newObj = util.stringify(obj);
        assert.notStrictEqual(newObj.indexOf('{"foo":"bar"}'), -1);
    });

    it('should stringify object', () => {
        const obj = {
            name: 'foo'
        };
        const stringifiedObj = util.stringify(obj);
        assert.deepEqual(stringifiedObj, '{"name":"foo"}');
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format config', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatConfig(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should make request', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then((data) => {
                assert.deepEqual(data, mockBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Bad status code/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail request with error', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody, { err: new Error('test error') });

        return util.makeRequest('example.com', '/', {})
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/HTTP error/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should return non-JSON body', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = '{someInvalidJSONData';
        setupRequestMock(mockRes, mockBody, { toJSON: false });

        return util.makeRequest('example.com', '/', {})
            .then((body) => {
                assert.strictEqual(body, mockBody);
            })
            .catch(err => Promise.reject(err));
    });

    it('should continue on error code for request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', { continueOnErrorCode: true })
            .then(() => Promise.resolve())
            .catch(err => Promise.reject(err));
    });

    it('should base64 decode', () => {
        const string = 'f5string';
        const encString = Buffer.from(string, 'ascii').toString('base64');

        const decString = util.base64('decode', encString);
        assert.strictEqual(decString, string);
    });

    it('should error on incorrect base64 action', () => {
        try {
            util.base64('someaction', 'foo');
            assert.fail('Error expected');
        } catch (err) {
            const msg = err.message || err;
            assert.notStrictEqual(msg.indexOf('Unsupported action'), -1);
        }
    });

    it('should fail network check', () => {
        const host = 'localhost';
        const port = 0;

        return util.networkCheck(host, port)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/networkCheck:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should compare version strings', () => {
        assert.throws(
            () => {
                util.compareVersionStrings('14.0', '<>', '14.0');
            },
            (err) => {
                if ((err instanceof Error) && /Invalid comparator/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
        assert.strictEqual(util.compareVersionStrings('14.1.0', '>', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.1', '>', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '==', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '===', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<=', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '>=', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '!=', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '!==', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '==', '15.0'), false);
        assert.strictEqual(util.compareVersionStrings('15.0', '==', '14.0'), false);
    });

    it('should return response as-is (Buffer) when requested', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = Buffer.from('something');
        request.get = (opts, cb) => {
            cb(null, mockRes, mockBody);
        };

        const opts = {
            method: 'GET',
            rawResponseBody: true
        };
        return util.makeRequest(constants.LOCAL_HOST, '/', opts)
            .then((res) => {
                assert.ok(mockBody.equals(res), 'should equal to origin Buffer');
            });
    });

    it('should correctly process different args', () => {
        const expectedURI = 'someproto://somehost:someport/someuri';
        const testData = [
            {
                args: [{ fullURI: expectedURI }],
                expected: expectedURI
            },
            {
                args: ['somehost', '/someuri', { protocol: 'someproto', port: 'someport' }],
                expected: expectedURI
            },
            {
                args: ['somehost', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport'
            },
            {
                args: ['somehost'],
                expected: 'http://somehost:80'
            }
        ];

        let idx = 0;
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        request.get = (opts, cb) => {
            assert.strictEqual(opts.uri, testData[idx].expected);
            cb(null, mockRes, {});
        };

        function _test() {
            return util.makeRequest.apply(null, testData[idx].args)
                .then(() => {
                    idx += 1;
                    if (idx < testData.length) {
                        return _test();
                    }
                    return Promise.resolve();
                });
        }
        return _test();
    });

    it('should fail when unable to build URI', () => {
        assert.throws(
            () => {
                util.makeRequest({});
            },
            (err) => {
                if ((err instanceof Error) && /makeRequest: No fullURI or host provided/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
    });

    it('should have no custom TS options in request options', () => {
        const tsReqOptions = ['rawResponseBody', 'continueOnErrorCode',
            'expectedResponseCode', 'includeResponseObject',
            'port', 'protocol', 'fullURI', 'allowSelfSignedCert', 'returnRequestOnly'
        ];

        const mockRes = { statusCode: 200, statusMessage: 'message' };
        request.get = (opts, cb) => {
            const optsKeys = Object.keys(opts);
            tsReqOptions.forEach((tsOptKey) => {
                assert.ok(optsKeys.indexOf(tsOptKey) === -1, `Found '${tsOptKey} in request options`);
            });
            cb(null, mockRes, {});
        };

        return util.makeRequest('host', { protocol: 'http', port: 456, continueOnErrorCode: true });
    });

    it('should copy object', () => {
        const src = { schedule: { frequency: 'daily', time: { start: '04:20', end: '6:00' } } };
        assert.deepStrictEqual(util.deepCopy(src), src);
    });

    it('should pass empty object check', () => {
        assert.strictEqual(util.isObjectEmpty({}), true, 'empty object');
        assert.strictEqual(util.isObjectEmpty(null), true, 'null');
        assert.strictEqual(util.isObjectEmpty(undefined), true, 'undefined');
        assert.strictEqual(util.isObjectEmpty([]), true, 'empty array');
        assert.strictEqual(util.isObjectEmpty(''), true, 'empty string');
        assert.strictEqual(util.isObjectEmpty(0), true, 'number');
        assert.strictEqual(util.isObjectEmpty({ 1: 1, 2: 2 }), false, 'object');
        assert.strictEqual(util.isObjectEmpty([1, 2, 3]), false, 'array');
    });
});

// purpose: validate util (schedule/time functions)
describe('Util (schedule/time functions)', () => {
    let util;

    before(() => {
        util = require('../../src/nodejs/util.js');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should get last day of the month', () => {
        // Dates for 2019 year
        const datesMapping = {
            1: 28, // February
            6: 31, // July
            7: 31, // August
            8: 30 //  September
        };
        Object.keys(datesMapping).forEach((monthNo) => {
            const date = new Date(2019, monthNo, 20);
            const expectedDay = datesMapping[monthNo];

            assert.strictEqual(util.getLastDayOfMonth(date), expectedDay);
        });
    });

    it('should return random number from range', () => {
        const left = -5;
        const right = 5;

        for (let i = 0; i < 100; i += 1) {
            const randNumber = util.getRandomArbitrary(left, right);
            assert.ok(left <= randNumber && randNumber <= right, `${randNumber} should be in range ${left}:${right}`);
        }
    });

    it('should parse HH:MM to array of 2 integers', () => {
        const timeStr = '01:30';
        const desired = [1, 30];
        const timeTuple = util.timeStrToTuple(timeStr);
        assert.deepStrictEqual(timeTuple, desired);
    });

    it('should fail to parse HH:MM:SS or invalid format to array of 2 integers', () => {
        const invalidStrings = [
            '00:00:00',
            '00',
            '00:',
            ':00',
            ':::',
            '00:00:',
            ':00:00',
            '24:00',
            '-1:-30',
            '00:60'
        ];
        const check = data => (() => util.timeStrToTuple(data));

        for (let i = 0; i < invalidStrings.length; i += 1) {
            assert.throws(check(invalidStrings[i]));
        }
    });

    it('should fail to calculate next execution date when provided invalid day', () => {
        const invalidDayOfWeek = ['Sunday1', -1, 8];
        function getInvalidSchedule(i) {
            return {
                frequency: 'weekly',
                day: invalidDayOfWeek[i],
                timeWindow: {
                    start: '00:00',
                    end: '05:00'
                }
            };
        }
        const check = data => (() => util.getNextFireDate(data));
        for (let i = 0; i < invalidDayOfWeek.length; i += 1) {
            assert.throws(check(getInvalidSchedule(i)));
        }
    });

    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const SCHEDULE_TEST_SETS = [
        { schedule: { frequency: 'daily', timeWindow: { start: '04:20', end: '6:00' } } },
        { schedule: { frequency: 'daily', timeWindow: { start: '23:20', end: '3:00' } } },
        { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '04:20', end: '6:00' } } },
        { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '23:20', end: '3:00' } } },
        { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '04:20', end: '6:00' } } },
        { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '23:20', end: '3:00' } } },
        { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '4:20', end: '6:00' } } },
        { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '23:20', end: '3:00' } } },
        { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '4:20', end: '6:00' } } },
        { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '23:20', end: '3:00' } } }
    ];

    function scheduleToStr(schedule) {
        let ret = `frequency=${schedule.frequency}`;
        if (schedule.day !== undefined) {
            ret = `${ret} day=${schedule.day}`;
        }
        ret = `${ret} start=${schedule.timeWindow.start} end=${schedule.timeWindow.end}`;
        return ret;
    }

    function getStartEndTimeFromSchedule(schedule) {
        return [
            util.timeStrToTuple(schedule.timeWindow.start),
            util.timeStrToTuple(schedule.timeWindow.end)
        ];
    }

    function getEndDate(date, schedule) {
        const endTime = util.timeStrToTuple(schedule.timeWindow.end);
        const dateEnd = new Date(date);
        dateEnd.setHours(endTime[0]);
        dateEnd.setMinutes(endTime[1]);
        dateEnd.setSeconds(0);
        dateEnd.setMilliseconds(0);

        // in case startTime > endTime
        if (date > dateEnd) {
            dateEnd.setDate(dateEnd.getDate() + 1);
        }
        return dateEnd;
    }

    function isTimeInRange(date, timeRange) {
        const time = date.getHours() * 60 + date.getMinutes();
        const start = timeRange[0][0] * 60 + timeRange[0][1];
        const end = timeRange[1][0] * 60 + timeRange[1][1];

        return (start < end && start <= time && time <= end)
            || (start > end && (start <= time || time <= end));
    }

    function standardCheck(first, second) {
        // check that second start not earlier first ends
        if (second <= first) {
            const errMsg = `Date ${second.toLocaleString()} should be > ${first.toLocaleString()}`;
            throw new Error(errMsg);
        }
    }

    function checkTimeRanges(dates, schedule) {
        const timeRange = getStartEndTimeFromSchedule(schedule);
        for (let i = 0; i < dates.length; i += 1) {
            if (!isTimeInRange(dates[i], timeRange)) {
                const errMsg = `Date ${dates[i].toLocaleString()} not in time range ${JSON.stringify(timeRange)}`;
                throw new Error(errMsg);
            }
        }
    }

    function checkDayOfWeek(dates, schedule) {
        // schedule.dayOfWeek - only string (other options verified above)
        const dayOfWeek = constants.DAY_NAME_TO_WEEKDAY[schedule.day.toLowerCase()];
        const startTime = util.timeStrToTuple(schedule.timeWindow.start);
        const endTime = util.timeStrToTuple(schedule.timeWindow.end);

        let nextDay = dayOfWeek + (startTime[0] > endTime[0] ? 1 : 0);
        // Sunday is 0, not 7
        nextDay = nextDay === 7 ? 0 : nextDay;

        for (let i = 0; i < dates.length; i += 1) {
            const dateWeekDay = dates[i].getDay();
            if (dateWeekDay !== dayOfWeek && dateWeekDay !== nextDay) {
                const errMsg = `Date ${dates[i].toLocaleString()}, week day is not ${dayOfWeek}`;
                throw new Error(errMsg);
            }
        }
    }

    function checkDayOfMonth(dates, schedule) {
        const startTime = util.timeStrToTuple(schedule.timeWindow.start);
        const endTime = util.timeStrToTuple(schedule.timeWindow.end);
        const nextDayAdd = startTime[0] > endTime[0] ? 1 : 0;

        for (let i = 0; i < dates.length; i += 1) {
            const date = dates[i].getDate();
            const lastDay = util.getLastDayOfMonth(dates[i]);
            const dayOfMonth = schedule.day > lastDay ? lastDay : schedule.day;
            let nextDay = dayOfMonth + nextDayAdd;
            nextDay = nextDay > lastDay ? 1 : nextDay;

            if (date !== dayOfMonth && date !== nextDay) {
                const errMsg = `Date ${dates[i].toLocaleString()}, month day should be in range ${dayOfMonth}:${nextDay}`;
                throw new Error(errMsg);
            }
        }
    }

    function checkDaily(schedule, first, second) {
        // dates are in time range already
        const firstEnd = getEndDate(first, schedule);
        const secondEnd = getEndDate(second, schedule);

        standardCheck(first, firstEnd);
        standardCheck(firstEnd, second);
        standardCheck(second, secondEnd);

        const distance = (secondEnd - firstEnd) / _MS_PER_DAY;
        const maxDistance = 1;

        if (distance !== maxDistance) {
            const errMsg = `Dates ${first.toLocaleString()} and ${second.toLocaleString()} has `
                + `distance ${distance} more than ${maxDistance}`;
            throw new Error(errMsg);
        }
    }

    function checkWeekly(schedule, first, second) {
        checkDayOfWeek([first, second], schedule);
        // since day of week passed then we don't need precision here
        const minDistance = 6;
        const maxDistance = 8;

        const distance = (second - first) / _MS_PER_DAY;
        if (!(minDistance <= distance && distance <= maxDistance)) {
            const errMsg = `Dates ${first.toLocaleString()} and ${second.toLocaleString()} has `
                + `invalid distance (should be in range ${minDistance}:${maxDistance}, actual ${distance})`;
            throw new Error(errMsg);
        }
    }

    function checkMonthly(schedule, first, second) {
        checkDayOfMonth([first, second], schedule);
        // since day of month passed then we don't need precision here
        const minDistance = 26;
        const maxDistance = 32;

        const actualDistance = (second - first) / _MS_PER_DAY;
        if (!(minDistance <= actualDistance && actualDistance <= maxDistance)) {
            const errMsg = `Dates ${first.toLocaleString()} and ${second.toLocaleString()} has `
                + `invalid distance (should be in range ${minDistance}:${maxDistance}, actual ${actualDistance})`;
            throw new Error(errMsg);
        }
    }

    const scheduleValidators = {
        daily: checkDaily,
        weekly: checkWeekly,
        monthly: checkMonthly
    };

    SCHEDULE_TEST_SETS.forEach((testSet) => {
        it(`should calculate next execution date with allowNow === true correctly according to schedule - ${scheduleToStr(testSet.schedule)}`, () => {
            const firstDate = util.getNextFireDate(testSet.schedule, null, false);
            const secondDate = util.getNextFireDate(testSet.schedule, firstDate, true);

            const endTime = util.timeStrToTuple(testSet.schedule.timeWindow.end);
            const firstEnd = new Date(firstDate);
            firstEnd.setHours(endTime[0]);
            firstEnd.setMinutes(endTime[1]);
            // in case startTime > endTime
            if (firstDate > firstEnd) {
                firstEnd.setDate(firstEnd.getDate() + 1);
            }
            if (!(firstEnd > secondDate)) {
                const errMsg = `Date ${secondDate.toLocaleString()} (from date ${firstDate.toLocaleString()}) `
                    + `should be less than ${firstEnd.toLocaleString()}`;
                throw new Error(errMsg);
            }
        });

        it(`should caculate next execution date correctly according to schedule - ${scheduleToStr(testSet.schedule)}`, () => {
            const validator = scheduleValidators[testSet.schedule.frequency];
            const dates = [util.getNextFireDate(testSet.schedule, null, false)];
            let firstDate = dates[0];

            for (let j = 0; j < 100; j += 1) {
                const secondDate = util.getNextFireDate(testSet.schedule, firstDate, false);
                dates.push(secondDate);

                try {
                    standardCheck(firstDate, secondDate);
                    checkTimeRanges([firstDate, secondDate], testSet.schedule);
                    // frequency specific vlidations
                    validator(testSet.schedule, new Date(firstDate), new Date(secondDate));
                } catch (err) {
                    console.log(dates.reverse());
                    throw err;
                }

                firstDate = secondDate;
            }
        });
    });
});

// purpose: validate util (tracer)
describe('Util (Tracer)', () => {
    let util;
    let config;
    const tracerFile = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux

    before(() => {
        util = require('../../src/nodejs/util.js');
    });
    beforeEach(() => {
        config = {
            trace: tracerFile
        };
        if (fs.existsSync(tracerFile)) {
            fs.unlinkSync(tracerFile);
        }
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should write to tracer', () => {
        const msg = 'foobar';
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        let error;
        return tracer.write(msg)
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(msg, contents);
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve(error);
            });
    });

    it('should fail to write when no data provided', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        return tracer.write(null)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Missing data to write/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should get existing tracer by the name', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        let tracer2;
        let error;

        return tracer.write('somethings')
            .then(() => {
                tracer2 = util.tracer.createFromConfig('class', 'obj', config);
                return tracer2.write('something3');
            })
            .then(() => {
                assert.strictEqual(tracer2.inode, tracer.inode, 'inode should be the sane');
                assert.strictEqual(tracer2.stream.fd, tracer.stream.fd, 'fd should be the same');
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (tracer2) {
                    util.tracer.remove(tracer2); // cleanup, otherwise will not exit
                }

                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    });

    it('should remove tracer by name', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        util.tracer.remove(tracer.name);
        assert.strictEqual(util.tracer.instances[tracer.name], undefined);
    });

    it('should remove tracer by filter', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        util.tracer.remove(null, t => t.name === tracer.name);
        assert.strictEqual(util.tracer.instances[tracer.name], undefined);
    });

    it('should truncate file', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        const expectedData = 'expectedData';
        let error;

        return tracer.write(expectedData)
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, expectedData);
                return tracer._truncate();
            }).then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, '');
                return tracer.write(expectedData);
            })
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, expectedData);
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit

                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    });

    it('should recreate file and dir when deleted', () => {
        const fileName = `${os.tmpdir()}/telemetryTmpDir/telemetry`; // os.tmpdir for windows + linux
        const tracerConfig = {
            trace: fileName
        };
        const tracer = util.tracer.createFromConfig('class', 'obj', tracerConfig);
        const expectedData = 'expectedData';
        let error;

        util.tracer.REOPEN_INTERVAL = 500;

        return tracer.write(expectedData)
            .then(() => {
                const contents = fs.readFileSync(fileName, 'utf8');
                assert.strictEqual(contents, expectedData);
                // remove file
                fs.unlinkSync(fileName);
                if (fs.existsSync(fileName)) {
                    assert.fail('Should remove file');
                }
                const dirName = path.dirname(fileName);
                fs.rmdirSync(dirName);
                if (fs.existsSync(dirName)) {
                    assert.fail('Should remove directory');
                }
            })
            // re-open should schedule in next 1sec
            .then(() => new Promise((resolve) => {
                function check() {
                    fs.exists(fileName, (exists) => {
                        if (exists) {
                            resolve(exists);
                        } else {
                            setTimeout(check, 200);
                        }
                    });
                }
                check();
            }))
            .then(() => {
                const contents = fs.readFileSync(fileName, 'utf8');
                assert.strictEqual(contents, '');
                assert.strictEqual(fs.existsSync(fileName), true, 'File should exists after recreation');
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    }).timeout(10000);
});
