/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const fileLogger = require('../winstonLogger.js').logger;
const constants = require('../../src/lib/constants.js');
const datetimeUtil = require('../../src/lib/datetimeUtil.js');


describe('Date and Time utils', () => {
    describe('getLastDayOfMonth', () => {
        // 2019 year
        const lastDaysMapping = {
            January: [0, 31],
            February: [1, 28],
            March: [2, 31],
            April: [3, 30],
            May: [4, 31],
            June: [5, 30],
            July: [6, 31],
            August: [7, 31],
            September: [8, 30],
            October: [9, 31],
            November: [10, 30],
            December: [11, 31]
        };
        Object.keys(lastDaysMapping).forEach((monthName) => {
            it(`should get last day of ${monthName} in 2019`, () => {
                const date = new Date();
                const args = lastDaysMapping[monthName];
                const expected = args[1];

                date.setUTCFullYear(2019, args[0], 1);
                const actual = datetimeUtil.getLastDayOfMonth(date);
                assert.strictEqual(actual, expected);
            });
        });

        it('should get last day of February in 2020 (leap year)', () => {
            const date = new Date();
            const expected = 29;
            date.setUTCFullYear(2020, 1, 1);
            const actual = datetimeUtil.getLastDayOfMonth(date);
            assert.strictEqual(actual, expected);
        });
    });

    describe('timeStrToTuple', () => {
        const validTimeStrings = {
            '00:00': [0, 0],
            '01:30': [1, 30],
            '23:59': [23, 59]
        };
        Object.keys(validTimeStrings).forEach((timeString) => {
            it(`should parse '${timeString}' to array of 2 integers`, () => {
                const expected = validTimeStrings[timeString];
                const actual = datetimeUtil.timeStrToTuple(timeString);
                assert.deepStrictEqual(actual, expected);
            });
        });

        const invalidTimeStrings = [
            '00:00:00', '00', '00:', ':00', ':::', '00:00:',
            ':00:00', '24:00', '-1:-30', '00:60'
        ];
        invalidTimeStrings.forEach((timeString) => {
            it(`should fail to parse '${timeString}' to array of 2 integers`, () => {
                assert.throws(
                    () => datetimeUtil.timeStrToTuple(timeString),
                    /(String should be in format HH:MM)|(Time should be between 00:00 and 23:59)/
                );
            });
        });
    });

    describe('setNextDate', () => {
        const nextDayMapping = {
            '2019-03-08T01:10:00.000Z': ['2019-03-09T01:10:00.000Z'],
            '2019-02-27T02:20:00.000Z': ['2019-02-28T02:20:00.000Z'],
            '2019-02-28T03:30:00.000Z': ['2019-03-01T03:30:00.000Z'],
            '2019-03-31T04:40:00.000Z': ['2019-04-01T04:40:00.000Z'],
            '2019-12-31T05:50:00.000Z': ['2020-01-01T05:50:00.000Z'],
            '2020-02-28T05:50:00.000Z': ['2020-02-29T05:50:00.000Z'],
            '2020-02-29T05:50:00.000Z': ['2020-03-01T05:50:00.000Z'],
            '2019-12-30T05:50:00.000Z': ['2020-01-01T05:50:00.000Z', 2],
            '2019-12-29T05:50:00.000Z': ['2019-12-27T05:50:00.000Z', -2],
            '2020-03-01T05:50:00.000Z': ['2020-02-28T05:50:00.000Z', -2]
        };
        Object.keys(nextDayMapping).forEach((dateStr) => {
            it(`should set next date for ${dateStr}`, () => {
                const args = nextDayMapping[dateStr];
                const expected = args[0];
                const date = new Date(Date.parse(dateStr));
                datetimeUtil.setNextDate(date, args[1]);
                assert.strictEqual(date.toISOString(), expected);
            });
        });
    });

    describe('setNextWeekDay', () => {
        const nextWeekDayMapping = {
            '2019-03-08T01:10:00.000Z': ['2019-03-15T01:10:00.000Z'], // + 7 days
            '2019-02-27T02:20:00.000Z': ['2019-03-06T02:20:00.000Z'], // + 7 days
            '2019-02-28T03:30:00.000Z': ['2019-03-07T03:30:00.000Z'], // + 7 days
            '2019-03-31T04:40:00.000Z': ['2019-04-07T04:40:00.000Z'], // + 7 days
            '2019-12-31T05:50:00.000Z': ['2020-01-07T05:50:00.000Z'], // + 7 days
            '2020-02-28T03:30:00.000Z': ['2020-03-06T03:30:00.000Z'], // + 7 days
            '2020-02-29T03:30:00.000Z': ['2020-03-07T03:30:00.000Z'], // + 7 days
            '2019-03-09T06:10:00.000Z': ['2019-03-11T06:10:00.000Z', 1], // next Monday
            '2019-02-26T07:20:00.000Z': ['2019-02-28T07:20:00.000Z', 4], // next Thursday
            '2019-02-24T08:30:00.000Z': ['2019-03-03T08:30:00.000Z', 0] // next Sunday
        };
        Object.keys(nextWeekDayMapping).forEach((dateStr) => {
            it(`should set next week date for ${dateStr}`, () => {
                const args = nextWeekDayMapping[dateStr];
                const expected = args[0];
                const date = new Date(Date.parse(dateStr));
                datetimeUtil.setNextWeekDay(date, args[1]);
                assert.strictEqual(date.toISOString(), expected);
            });
        });
    });

    describe('setNextMonthDay', () => {
        const nextMonthDayMapping = {
            '2019-03-08T01:10:00.000Z': ['2019-04-08T01:10:00.000Z'], // + 1 month
            '2019-02-27T02:20:00.000Z': ['2019-03-27T02:20:00.000Z'], // + 1 month
            '2019-02-28T03:30:00.000Z': ['2019-03-28T03:30:00.000Z'], // + 1 month
            '2019-03-31T04:40:00.000Z': ['2019-04-30T04:40:00.000Z'], // + 1 month
            '2019-12-31T05:50:00.000Z': ['2020-01-31T05:50:00.000Z'], // + 1 month
            '2020-02-29T03:30:00.000Z': ['2020-03-29T03:30:00.000Z'], // + 1 month
            '2019-03-09T06:10:00.000Z': ['2019-03-30T06:10:00.000Z', 30],
            '2019-02-26T07:20:00.000Z': ['2019-02-28T07:20:00.000Z', 30],
            '2019-01-31T08:30:00.000Z': ['2019-02-28T08:30:00.000Z', 31],
            '2020-01-31T08:30:00.000Z': ['2020-02-29T08:30:00.000Z', 31]
        };
        Object.keys(nextMonthDayMapping).forEach((dateStr) => {
            it(`should set next month date for ${dateStr}`, () => {
                const args = nextMonthDayMapping[dateStr];
                const expected = args[0];
                const date = new Date(Date.parse(dateStr));
                datetimeUtil.setNextMonthDay(date, args[1]);
                assert.strictEqual(date.toISOString(), expected);
            });
        });
    });

    describe('getWeekDayNo', () => {
        const validWeekDays = {
            0: 0,
            1: 1,
            2: 2,
            3: 3,
            4: 4,
            5: 5,
            6: 6,
            7: 0,
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6
        };
        Object.keys(validWeekDays).forEach((validWeekDay) => {
            it(`should get valid weekday for ${validWeekDay}`, () => {
                validWeekDay = Number.isNaN(parseInt(validWeekDay, 10))
                    ? validWeekDay : parseInt(validWeekDay, 10);
                const expected = validWeekDays[validWeekDay];
                const actual = datetimeUtil.getWeekDayNo(validWeekDay);
                assert.strictEqual(actual, expected);
            });
        });

        const invalidWeekDays = [-1, 10, 8, 'something'];
        invalidWeekDays.forEach((invalidWeekDay) => {
            it(`should fail to get weekday for ${invalidWeekDay}`, () => {
                invalidWeekDay = Number.isNaN(parseInt(invalidWeekDay, 10))
                    ? invalidWeekDay : parseInt(invalidWeekDay, 10);
                assert.throws(
                    () => datetimeUtil.getWeekDayNo(invalidWeekDay),
                    /(Unknown weekday number)|(Unknown weekday name)/
                );
            });
        });
    });

    describe('transformUTCToLocalDate / transformLocalToUTCDate', () => {
        function getDatetimeTuple(date, utc) {
            utc = utc ? 'UTC' : '';
            return [
                date[`get${utc}FullYear`](),
                date[`get${utc}Month`](),
                date[`get${utc}Date`](),
                date[`get${utc}Hours`](),
                date[`get${utc}Minutes`](),
                date[`get${utc}Seconds`](),
                date[`get${utc}Milliseconds`]()
            ];
        }

        it('should transform local date to UTC date', () => {
            const date = new Date('2019-01-31T08:30:00.000Z');
            const expected = getDatetimeTuple(date);
            const actual = getDatetimeTuple(datetimeUtil.transformLocalToUTCDate(date), true);
            assert.deepStrictEqual(actual, expected);
        });

        it('should transform UTC date to local date', () => {
            const date = new Date('2019-01-31T08:30:00.000Z');
            const expected = getDatetimeTuple(date, true);
            const actual = getDatetimeTuple(datetimeUtil.transformUTCToLocalDate(date));
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('getNextFireDate', () => {
        const SCHEDULE_TEST_SETS = [
            { schedule: { frequency: 'daily', timeWindow: { start: '04:20', end: '6:00' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '23:20', end: '2:00' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '23:20', end: '3:00' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '02:00', end: '3:00' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '00:00', end: '23:59' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '00:00', end: '00:00' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '12:00', end: '11:59' } } },
            { schedule: { frequency: 'daily', timeWindow: { start: '12:00', end: '12:00' } } },
            { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '04:20', end: '6:00' } } },
            { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '23:20', end: '2:00' } } },
            { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '23:20', end: '3:00' } } },
            { schedule: { frequency: 'weekly', day: 'Monday', timeWindow: { start: '02:00', end: '3:00' } } },
            { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '04:20', end: '6:00' } } },
            { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '23:20', end: '2:00' } } },
            { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '23:20', end: '3:00' } } },
            { schedule: { frequency: 'weekly', day: 'Sunday', timeWindow: { start: '02:00', end: '3:00' } } },
            { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '4:20', end: '6:00' } } },
            { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '23:20', end: '2:00' } } },
            { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '23:20', end: '3:00' } } },
            { schedule: { frequency: 'monthly', day: 31, timeWindow: { start: '02:00', end: '3:00' } } },
            { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '4:20', end: '6:00' } } },
            { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '23:20', end: '2:00' } } },
            { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '23:20', end: '3:00' } } },
            { schedule: { frequency: 'monthly', day: 15, timeWindow: { start: '02:00', end: '3:00' } } }
        ];

        function scheduleToStr(schedule) {
            let ret = `frequency=${schedule.frequency}`;
            if (schedule.day !== undefined) {
                ret = `${ret} day=${schedule.day}`;
            }
            ret = `${ret} start=${schedule.timeWindow.start} end=${schedule.timeWindow.end}`;
            return ret;
        }

        describe('allowNow === true', () => {
            const startDates = [
                '2020-03-07T02:00:00.000Z', // for daylight saving time check
                '2020-10-31T01:00:00.000Z', // for daylight saving time check
                null // random date
            ];
            startDates.forEach((startDate) => {
                SCHEDULE_TEST_SETS.forEach((testSet) => {
                    it('should calculate next execution date'
                        + ` correctly according to schedule - ${scheduleToStr(testSet.schedule)}`
                        + ` (start date = ${startDate || 'random date'})`, () => {
                        startDate = startDate ? new Date(startDate) : null;
                        // calculate first date
                        const firstDate = datetimeUtil.getNextFireDate(testSet.schedule, startDate, false, true);
                        // set 10 min back in case date is close to 'end'
                        firstDate.setUTCMinutes(firstDate.getUTCMinutes() - 10);
                        // calculate second date
                        const secondDate = datetimeUtil.getNextFireDate(testSet.schedule, firstDate, true, true);
                        // calculate 'end' date
                        const endTime = datetimeUtil.timeStrToTuple(testSet.schedule.timeWindow.end);
                        const endDate = new Date(firstDate);
                        endDate.setUTCHours(endTime[0], endTime[1], 0, 0);
                        // in case firstDate > endDate (happens only when timeWindow is 23:00 - 00:00+)
                        if (firstDate > endDate) {
                            datetimeUtil.setNextDate(endDate);
                        }
                        if (firstDate >= secondDate) {
                            const errMsg = `First date ${firstDate.toISOString()} should be less than`
                                + ` second date ${secondDate.toISOString()}`;
                            throw new Error(errMsg);
                        }
                        if (endDate < secondDate) {
                            const errMsg = `Date ${secondDate.toISOString()} (from date ${firstDate.toISOString()}) `
                                + `should be less than or equal to ${endDate.toISOString()}`;
                            throw new Error(errMsg);
                        }
                    });
                });
            });
        });

        describe('allowNow === false', () => {
            const _MS_PER_DAY = 1000 * 60 * 60 * 24;

            function getStartEndTimeFromSchedule(schedule) {
                return [
                    datetimeUtil.timeStrToTuple(schedule.timeWindow.start),
                    datetimeUtil.timeStrToTuple(schedule.timeWindow.end)
                ];
            }
            function getEndDate(date, schedule) {
                const endTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.end);
                const dateEnd = new Date(date);
                dateEnd.setUTCHours(endTime[0], endTime[1], 0, 0);
                // in case startTime > endTime
                if (date > dateEnd) {
                    datetimeUtil.setNextDate(dateEnd);
                }
                return dateEnd;
            }
            function getStartDate(date, schedule) {
                const startTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.start);
                const dateStart = new Date(date);
                dateStart.setUTCHours(startTime[0], startTime[1], 0, 0);
                // in case startTime > endTime
                if (date < dateStart) {
                    datetimeUtil.setNextDate(dateStart, -1);
                }
                return dateStart;
            }

            function isTimeInRange(date, timeRange) {
                const time = date.getUTCHours() * 60 + date.getUTCMinutes();
                const start = timeRange[0][0] * 60 + timeRange[0][1];
                const end = timeRange[1][0] * 60 + timeRange[1][1];

                if (start === end) {
                    return true;
                }
                return (start < end && start <= time && time <= end)
                    || (start > end && (start <= time || time <= end));
            }

            function standardCheck(first, second) {
                // check that second start not earlier first ends
                if (second <= first) {
                    const errMsg = `Date ${second.toISOString()} should be > ${first.toISOString()}`;
                    throw new Error(errMsg);
                }
            }

            function checkTimeRanges(dates, schedule) {
                const timeRange = getStartEndTimeFromSchedule(schedule);
                for (let i = 0; i < dates.length; i += 1) {
                    if (!isTimeInRange(dates[i], timeRange)) {
                        const errMsg = `Date ${dates[i].toISOString()} not in time range ${JSON.stringify(timeRange)}`;
                        throw new Error(errMsg);
                    }
                }
            }

            function checkDayOfWeek(dates, schedule) {
                // schedule.dayOfWeek - only string (other options verified above)
                const dayOfWeek = constants.DAY_NAME_TO_WEEKDAY[schedule.day.toLowerCase()];
                const startTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.start);
                const endTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.end);

                let nextDay = dayOfWeek + (startTime[0] > endTime[0] ? 1 : 0);
                // Sunday is 0, not 7
                nextDay = nextDay === 7 ? 0 : nextDay;

                for (let i = 0; i < dates.length; i += 1) {
                    const dateWeekDay = dates[i].getUTCDay();
                    if (dateWeekDay !== dayOfWeek && dateWeekDay !== nextDay) {
                        const errMsg = `Date ${dates[i].toISOString()}, week day is not ${dayOfWeek}`;
                        throw new Error(errMsg);
                    }
                }
            }

            function checkDayOfMonth(dates, schedule) {
                const startTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.start);
                const endTime = datetimeUtil.timeStrToTuple(schedule.timeWindow.end);
                const nextDayAdd = startTime[0] > endTime[0] ? 1 : 0;

                for (let i = 0; i < dates.length; i += 1) {
                    const date = dates[i].getUTCDate();
                    const lastDay = datetimeUtil.getLastDayOfMonth(dates[i]);
                    const dayOfMonth = schedule.day > lastDay ? lastDay : schedule.day;
                    let nextDay = dayOfMonth + nextDayAdd;
                    nextDay = nextDay > lastDay ? 1 : nextDay;

                    if (date !== dayOfMonth && date !== nextDay) {
                        const errMsg = `Date ${dates[i].toISOString()}, month day should be in range ${dayOfMonth}:${nextDay}`;
                        throw new Error(errMsg);
                    }
                }
            }

            function checkDaily(schedule, first, second) {
                // dates are in time range already
                const firstEnd = getEndDate(first, schedule);
                const firstStart = getStartDate(first, schedule);
                const secondEnd = getEndDate(second, schedule);
                const secondStart = getStartDate(second, schedule);

                standardCheck(firstStart, first);
                standardCheck(first, firstEnd);
                // standardCheck(firstEnd, secondStart);
                standardCheck(secondStart, second);
                standardCheck(second, secondEnd);

                const startDistance = (secondStart - firstStart) / _MS_PER_DAY;
                const endDistance = (secondStart - firstStart) / _MS_PER_DAY;
                if (!(startDistance > 0.8 && startDistance < 1.2 && endDistance > 0.8 && endDistance < 1.2)) {
                    const errMsg = `Dates ${first.toISOString()} and ${second.toISOString()} are not in daily schedule`;
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
                    const errMsg = `Dates ${first.toISOString()} and ${second.toISOString()} has `
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
                    const errMsg = `Dates ${first.toISOString()} and ${second.toISOString()} has `
                        + `invalid distance (should be in range ${minDistance}:${maxDistance}, actual ${actualDistance})`;
                    throw new Error(errMsg);
                }
            }

            const scheduleValidators = {
                daily: checkDaily,
                weekly: checkWeekly,
                monthly: checkMonthly
            };

            const startDates = [
                '2020-03-01T02:00:00.000Z', // for daylight saving time check
                '2020-10-15T01:00:00.000Z', // for daylight saving time check
                null // random date
            ];
            startDates.forEach((startDate) => {
                SCHEDULE_TEST_SETS.forEach((testSet) => {
                    it('should calculate next execution date correctly according to'
                        + ` schedule - ${scheduleToStr(testSet.schedule)}`
                        + ` (start date = ${startDate || 'random date'})`, () => {
                        startDate = startDate ? new Date(startDate) : startDate;
                        const validator = scheduleValidators[testSet.schedule.frequency];
                        const dates = [datetimeUtil.getNextFireDate(testSet.schedule, startDate, false, true)];
                        let firstDate = dates[0];

                        for (let j = 0; j < 100; j += 1) {
                            const secondDate = datetimeUtil.getNextFireDate(testSet.schedule, firstDate, false, true);
                            dates.push(secondDate);
                            try {
                                standardCheck(firstDate, secondDate);
                                checkTimeRanges([firstDate, secondDate], testSet.schedule);
                                // frequency specific validation(s)
                                validator(testSet.schedule, new Date(firstDate), new Date(secondDate));
                            } catch (err) {
                                // eslint-disable-next-line no-console
                                fileLogger.debug('List of dates', dates);
                                throw err;
                            }
                            firstDate = secondDate;
                        }
                    });
                });
            });
        });

        it('should return date in UTC format', () => {
            const schedule = { frequency: 'daily', timeWindow: { start: '05:00', end: '5:59' } };
            const startDate = new Date('2020-03-07T02:00:00.000Z');
            const nextDate = datetimeUtil.getNextFireDate(schedule, startDate, false, true);

            assert.strictEqual(nextDate.getUTCFullYear(), 2020);
            assert.strictEqual(nextDate.getUTCMonth(), 2);
            assert.strictEqual(nextDate.getUTCDate(), 7);
            assert.strictEqual(nextDate.getUTCHours(), 5);
        });

        it('should return date in local format', () => {
            const schedule = { frequency: 'daily', timeWindow: { start: '05:00', end: '5:59' } };
            const startDate = new Date('3/3/2020, 6:00:00 PM');
            const nextDate = datetimeUtil.getNextFireDate(schedule, startDate, false);

            assert.strictEqual(nextDate.getFullYear(), 2020);
            assert.strictEqual(nextDate.getMonth(), 2);
            assert.strictEqual(nextDate.getDate(), 4);
            assert.strictEqual(nextDate.getHours(), 5);
        });
    });
});
