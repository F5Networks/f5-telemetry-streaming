/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const constants = require('../constants');
const util = require('./misc');

/**
 * Parse HH:MM string to tuple(integer, integer)
 *
 * @param {string} timeStr - time string in HH:MM format
 *
 * @returns {Array} array with parsed data
 */
function timeStrToTuple(timeStr) {
    const timeTuple = timeStr.split(':');
    if (timeTuple.length !== 2) {
        throw new Error('String should be in format HH:MM');
    }
    for (let i = 0; i < timeTuple.length; i += 1) {
        timeTuple[i] = parseInt(timeTuple[i], 10);
    }
    if (!(timeTuple[0] >= 0 && timeTuple[0] < 24 && timeTuple[1] >= 0 && timeTuple[1] < 60)) {
        throw new Error('Time should be between 00:00 and 23:59');
    }
    return timeTuple;
}

/**
 * Gets the current time (Unix Epoch time) in seconds
 *
 * @returns {Number} Number of seconds
 */
function getCurrentUnixTimeInSeconds() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Get the last day of month for provided date
 * Note: UTC only
 *
 * @param {Date} date - date object
 *
 * @returns {Integer} last day of month
 */
function getLastDayOfMonth(date) {
    // lets calculate the last day of provided month
    const endOfMonth = new Date(date);
    // reset date, to avoid situations like 3/31 + 1 month = 5/1
    endOfMonth.setUTCDate(1);
    // set next month
    endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
    // if 0 is provided for dayValue, the date will be set to the last day of the previous month
    endOfMonth.setUTCDate(0);
    return endOfMonth.getUTCDate();
}

/**
 * Get integer number corresponding to the day of the week
 *
 * @param {String | Integer} day - weekday name or number (0 and 7 represents Sunday)
 *
 * @returns {Integer} weekday number
 */
function getWeekDayNo(day) {
    // if it is number -> convert it to string representation
    // to handle 0 and 7 in single place
    if (typeof day !== 'string') {
        day = constants.WEEKDAY_TO_DAY_NAME[day];
    }
    if (typeof day === 'undefined') {
        throw new Error(`Unknown weekday number - ${arguments[0]}`);
    }
    day = constants.DAY_NAME_TO_WEEKDAY[day.toLowerCase()];
    // just in case something strange happened - e.g. unknown week day name
    if (typeof day === 'undefined') {
        throw new Error(`Unknown weekday name - ${arguments[0]}`);
    }
    return day;
}

/**
 * Set date to next day
 * Note: UTC only
 *
 * @param {Date} date       - date to modify
 * @param {Integer} [delta] - delta to add to date
 */
function setNextDate(date, delta) {
    date.setUTCDate(date.getUTCDate() + (typeof delta === 'undefined' ? 1 : delta));
}

/**
 * Set date to next week or week day
 * Note: UTC only
 *
 * @param {Date}    date  - date to modify
 * @param {Integer} [day] - week day (0 represents Sunday)
 */
function setNextWeekDay(date, day) {
    const delta = typeof day === 'undefined' ? 7 : (day - date.getUTCDay());
    date.setUTCDate(date.getUTCDate() + delta + (delta > 0 ? 0 : 7));
}

/**
 * Set date to next month or day of month
 * Note: UTC only
 *
 * @param {Date}    date  - date to modify
 * @param {Integer} [day] - day of month
 */
function setNextMonthDay(date, day) {
    let lastDayOfMonth = getLastDayOfMonth(date);
    day = typeof day === 'undefined' ? date.getUTCDate() : day;

    if (date.getUTCDate() >= (day > lastDayOfMonth ? lastDayOfMonth : day)) {
        // move date to first day of next month
        date.setUTCMonth(date.getUTCMonth() + 1, 1);
        lastDayOfMonth = getLastDayOfMonth(date);
    }
    date.setUTCDate(day > lastDayOfMonth ? lastDayOfMonth : day);
}

/**
 * Convert local date to UTC Date
 *
 * @param {Date} date - Date object to transform
 *
 * @returns {Date} UTC Date object
 */
function transformLocalToUTCDate(date) {
    return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    ));
}

/**
 * Convert UTC date to local Date
 *
 * @param {Date} date - Date object to transform
 *
 * @returns {Date} local Date object
 */
function transformUTCToLocalDate(date) {
    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
    );
}

/**
 * @typedef Schedule
 *
 * @property {String}           frequency    - event frequency, allowed values - daily, weekly, monthly
 * @property {Object}           time         - time object
 * @property {String}           time.start   - start time in format HH:MM
 * @property {String}           time.end     - end time in format HH:MM
 * @property {Integer}          [dayOfMonth] - day of month, required for 'monthly'
 * @property {String | Integer} [dayOfWeek]  - day of week, could be name (e.g. Monday) or
 *                                             number from 0-7, where 0 and 7 are Sunday. Required for
 */
/**
 * Get next execution date for provided schedule
 *
 * @param {Schedule} schedule   - schedule object
 * @param {Date}     [fromDate] - data to count next execution from, by default current date
 * @param {Boolean}  [allowNow] - e.g. fromDate is 3am and schedule time is 23pm - 4am,
 *                                frequency is daily. If allowNow === true then next
 *                                execution date will be between 3am and 4am same day,
 *                                otherwise next execution date will be same day
 *                                between 23pm and 4am next day.
 * @param {Boolean} [utcOnly]  - treat fromDate (if passed) as UTC date and return UTC date.
 *                               Allow to avoid Daylight Saving calculation.
 *
 * @returns {Date} next execution date
 */
function getNextFireDate(schedule, fromDate, allowNow, utcOnly) {
    // setup defaults
    allowNow = typeof allowNow === 'undefined' ? true : allowNow;
    fromDate = fromDate ? new Date(fromDate) : new Date();
    if (!utcOnly) {
        fromDate = transformLocalToUTCDate(fromDate);
    }
    // adjustment function
    let adjustment;
    // check if date fits schedule or not
    let isOnSchedule;

    if (schedule.frequency === 'daily') {
        // move time forward for a day
        adjustment = setNextDate;
        // for daily basic simply return true
        isOnSchedule = () => true;
    } else if (schedule.frequency === 'weekly') {
        const dayOfWeek = getWeekDayNo(schedule.day);
        // move time forward for a week
        adjustment = (date) => setNextWeekDay(date, dayOfWeek);
        // simply check if day is desired week day
        isOnSchedule = (date) => date.getUTCDay() === dayOfWeek;
    } else {
        // monthly schedule, day of month
        const dayOfMonth = schedule.day;
        // move date to desired dayOfMonth and to next month if needed
        adjustment = (date) => setNextMonthDay(date, dayOfMonth);
        // simply check current date against desired
        isOnSchedule = function (date) {
            const lastDayOfMonth = getLastDayOfMonth(date);
            return date.getUTCDate() === (dayOfMonth > lastDayOfMonth ? lastDayOfMonth : dayOfMonth);
        };
    }
    // time start and end are expected to be in HH:MM format.
    const startTimeTuple = timeStrToTuple(schedule.timeWindow.start);
    const endTimeTuple = timeStrToTuple(schedule.timeWindow.end);

    let startExecDate = new Date(fromDate);
    startExecDate.setUTCHours(startTimeTuple[0], startTimeTuple[1], 0, 0);
    // simply moving clock for 1 day back if we a going to try fit current time
    if (allowNow) {
        setNextDate(startExecDate, -1);
    }

    let endExecDate = new Date(startExecDate);
    endExecDate.setUTCHours(endTimeTuple[0], endTimeTuple[1], 0, 0);
    // handle situations like start 23pm and end 4am
    if (startExecDate >= endExecDate) {
        setNextDate(endExecDate);
    }
    let windowSize = endExecDate.getTime() - startExecDate.getTime();
    while (!(isOnSchedule(startExecDate) && ((allowNow && startExecDate <= fromDate && fromDate < endExecDate)
            || startExecDate > fromDate))) {
        adjustment(startExecDate);
        endExecDate = new Date(startExecDate);
        endExecDate.setTime(endExecDate.getTime() + windowSize);
    }
    if (startExecDate <= fromDate && fromDate < endExecDate) {
        startExecDate = fromDate;
        windowSize = endExecDate.getTime() - startExecDate.getTime();
    }
    // finally set random time
    startExecDate.setTime(startExecDate.getTime() + Math.floor(util.getRandomArbitrary(0, windowSize)));
    return utcOnly ? startExecDate : transformUTCToLocalDate(startExecDate);
}

/**
 * Convert high-resolution timestamp to nanoseconds
 *
 * @param {[integer, integer]} hrtime - process.hrtime() result
 *
 * @returns {integer} timestamp in nanoseconds
 */
function nanohrtime(hrtime) {
    return hrtime[0] * 1e9 + hrtime[1];
}

/** @returns {integer} high-resolution timestamp value */
function hrtimestamp() {
    return nanohrtime(process.hrtime());
}

module.exports = {
    getCurrentUnixTimeInSeconds,
    getLastDayOfMonth,
    getNextFireDate,
    getWeekDayNo,
    hrtimestamp,
    nanohrtime,
    setNextDate,
    setNextMonthDay,
    setNextWeekDay,
    timeStrToTuple,
    transformLocalToUTCDate,
    transformUTCToLocalDate
};
