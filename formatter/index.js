/**
 * Adapted from https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils
 *
 * Original copyright (c) 2015-present, Facebook, Inc, licensed under the MIT license.
 *
 * https://github.com/facebookincubator/create-react-app/blob/master/LICENSE
 */

const chalk = require('chalk');
const stripAnsi = require('strip-ansi');
const table = require('text-table');

const isError = (message) => {
  // message.fatal is a boolean
  return message.fatal || message.severity === 2;
};

const formatter = (results) => {
  let output = '\n';
  let hasErrors = false;
  let reportContainsErrorRuleIDs = false;

  results.forEach((result) => {
    let messages = result.messages;

    if (messages.length === 0) {
      return;
    }

    messages = messages.map((message) => {
      let messageType;
      let line = message.line || 0;
      let position = chalk.cyan(`Line ${line}:`);

      if (isError(message)) {
        messageType = 'error';
        hasErrors = true;

        if (message.ruleId) {
          reportContainsErrorRuleIDs = true;
        }
      } else {
        messageType = 'warn';
      }

      return [
        '',
        position,
        messageType,
        message.message.replace(/\.$/, ''),
        chalk.red(message.ruleId || '')
      ];
    });

    // if there are error messages, we want to show only errors
    if (hasErrors) {
      messages = messages.filter((m) => m[2] === 'error');
    }

    // add color to rule keywords
    messages.forEach((m) => {
      m[4] = m[2] === 'error' ? chalk.red(m[4]) : chalk.yellow(m[4]);
      m.splice(2, 1);
    });

    let outputTable = table(messages, {
      align: ['l', 'l', 'l'],

      stringLength (str) {
        return stripAnsi(str).length;
      }
    });

    output += `${outputTable}\n\n`;
  });

  if (reportContainsErrorRuleIDs) {
    output += `Search for the ${chalk.yellow('keywords')} to learn more about each error.\nTo ignore, add ${chalk.gray('// eslint-disable-next-line')} to the line before.`;
  }

  return output;
};

module.exports = formatter;
