/**
 * Adapted from https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils
 *
 * Original copyright (c) 2015-present, Facebook, Inc, licensed under the MIT license.
 *
 * https://github.com/facebookincubator/create-react-app/blob/master/LICENSE
 */

const address = require('address');
const chalk = require('chalk');
const filesize = require('filesize');
const fs = require('fs');
const gzipSize = require('gzip-size').sync;
const notifier = require('node-notifier');
const ora = require('ora');
const os = require('os');
const path = require('path');
const stripAnsi = require('strip-ansi');
const url = require('url');

class FormatMessages {
  /**
   * The logic for {@link FormatMessagesWebpackPlugin}.
   *
   * @constructor
   * @param {object} options - Disable notifications
   */
  constructor (options) {
    this.ora = ora();
    this.hasNotifications = options.notifications;
    this.handleCompile = this.handleCompile.bind(this);
    this.handleInvalid = this.handleInvalid.bind(this);
    this.handleDone = this.handleDone.bind(this);
    this.handleExit = this.handleExit.bind(this);
  }

  /**
   * Clears the console in a cross-platform way.
   * See {@link https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils#clearconsole-void}
   */
  clearConsole () {
    const platform = process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H';

    process.stdout.write(platform);
  }

  /**
   * Returns an object with local and remote URLs for webpack-dev-server.
   * See {@link https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils#webpackdevserverutils}
   *
   * @param {object} compiler - the Webpack compiler configuration object
   * @return {object}
   */
  prepareURLs (compiler) {
    const devServer = compiler.options.devServer;
    const protocol = devServer.https ? 'https' : 'http';
    const host = devServer.host;
    const port = devServer.port;

    const isUnspecifiedHost = host === '0.0.0.0' || host === '::';
    const urlRegex = /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/;

    let prettyHost;
    let lanURLForConfig;
    let lanURLForTerminal;

    const formatURL = (hostname) => (
      url.format({
        protocol: protocol,
        hostname: hostname,
        port: port,
        pathname: '/'
      })
    );

    if (isUnspecifiedHost) {
      prettyHost = 'localhost';

      try {
        // Only returns an IPv4 address
        lanURLForConfig = address.ip();

        if (lanURLForConfig) {
          // Check if the address is a private IP
          if (urlRegex.test(lanURLForConfig)) {
            // Format the address
            lanURLForTerminal = formatURL(lanURLForConfig);
          } else {
            // Discard the address if not private
            lanURLForConfig = undefined;
          }
        }
      } catch (_) {
        //
      }
    } else {
      prettyHost = host;
    }

    return {
      lanURLForConfig: lanURLForConfig,
      lanURLForTerminal: lanURLForTerminal,
      localURLForTerminal: formatURL(prettyHost),
      localURLForBrowser: formatURL(prettyHost)
    };
  }

  /**
   * Prints the local and network URLs served by webpack-dev-server.
   *
   * @param {object} urls - the return value of [prepareURLs()]{@link FormatMessages#prepareURLs}
   */
  printInstructions (urls) {
    let name;

    // Get the package name
    // Throws if package.json doesn't exist in the same folder as the Webpack config
    try {
      name = require('../../../package.json').name;
    } catch (_) {
      name = 'bundle';
    }

    console.log(`You can view ${chalk.cyan(name)} in the browser:`);
    console.log();

    if (urls.lanURLForTerminal) {
      console.log(`  ${chalk.cyan('Local:')}            ${urls.localURLForTerminal}`);
      console.log(`  ${chalk.cyan('On Your Network:')}  ${urls.lanURLForTerminal}`);
    } else {
      console.log(`  ${urls.localURLForTerminal}`);
    }

    console.log();
  }

  /**
   * Extracts and prettifies warning and error messages from the Webpack stats object.
   * See {@link https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils#formatwebpackmessageserrors-arraystring-warnings-arraystring-errors-arraystring-warnings-arraystring}
   *
   * @param {object} stats - the Webpack compilation stats object
   * @return {object}
   */
  formatWebpackMessages (stats) {
    const json = stats.toJson({}, true);
    const isLikelyASyntaxError = (message) => message.includes('Syntax error:');

    let result;

    // Cleans up Webpack error messages
    const formatMessage = (message) => {
      const exportRegex = /\s*(.+?)\s*(")?export '(.+?)' was not found in '(.+?)'/;
      const webpackRegex = /^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm;

      let lines = message.split('\n');

      // If line has extra newline character, remove it
      if (lines.length > 2 && lines[1] === '') {
        lines.splice(1, 1);
      }

      // Remove webpack-specific loader notation from filename
      if (lines[0].includes('!')) {
        lines[0] = lines[0].substr(lines[0].lastIndexOf('!') + 1);
      }

      // Remove Webpack entry points from messages
      lines = lines.filter(line => !line.startsWith(' @ '));

      // line #0 is filename
      // line #1 is the main error message
      if (!lines[0] || !lines[1]) {
        return lines.join('\n');
      }

      // Clean up "Module not found" errors
      if (lines[1].startsWith('Module not found: ')) {
        lines = [
          lines[0],
          lines[1]
            .replace("Cannot resolve 'file' or 'directory' ", '')
            .replace('Cannot resolve module ', '')
            .replace('Error: ', '')
            .replace('[CaseSensitivePathsPlugin] ', '')
        ];
      }

      // Clean up syntax errors
      if (lines[1].startsWith('Module build failed: ')) {
        lines[1] = lines[1].replace('Module build failed: SyntaxError:', 'Syntax error:');
      }

      // Clean up export errors
      if (lines[1].match(exportRegex)) {
        lines[1] = lines[1].replace(exportRegex, "$1 '$4' does not contain an export named '$3'.");
      }

      lines[0] = chalk.inverse(lines[0]);

      // Reassemble the message
      return lines
        .join('\n')
        .replace(webpackRegex, '')
        .trim();
    };

    result = {
      errors: json.errors.map(message => formatMessage(message)),
      warnings: json.warnings.map(message => formatMessage(message))
    };

    // Only return errors that are likely syntax errors instead of ESLint parsing errors
    if (result.errors.some(message => isLikelyASyntaxError(message))) {
      result.errors = result.errors.filter(message => isLikelyASyntaxError(message));
    }

    return result;
  }

  /**
   * Prints emitted JS and CSS asset sizes after build
   * Displays a warning and suggestion to code-split if assets are too big
   * See {@link https://github.com/facebookincubator/create-react-app/tree/master/packages/react-dev-utils#printfilesizesafterbuildwebpackstats-webpackstats-previousfilesizes-opaquefilesizes-buildfolder-string-maxbundlegzipsize-number-maxchunkgzipsize-number}
   *
   * @param {object} compiler - the Webpack compiler configuration object
   * @param {object} stats - the Webpack compilation stats object
   */
  printFileSizesAfterBuild (compiler, stats) {
    const outputPath = compiler.options.output.path;

    let assets;
    let longestSizeLabelLength;

    // Convert the stats object to an array of objects used to display file size information
    assets = stats
      .toJson()
      .assets
      .filter(asset => /\.(js|css)$/.test(asset.name))
      .map(asset => {
        const contents = fs.readFileSync(path.join(outputPath, asset.name));
        const size = gzipSize(contents);

        return {
          folder: path.join(path.basename(outputPath), path.dirname(asset.name)),
          name: path.basename(asset.name),
          size: size,
          label: filesize(size)
        };
      })
      .sort((a, b) => b.size - a.size);

    // Get the length of the longest label
    longestSizeLabelLength = Math.max.apply(null, assets.map(a => stripAnsi(a.label).length));

    console.log('File sizes after gzip:');
    console.log();

    // Iterate over the assets array and print each
    assets.forEach(asset => {
      let length;
      let label = asset.label;

      // Get the length of the label
      length = stripAnsi(label).length;

      // Adds spaces so the finished output is aligned
      if (length < longestSizeLabelLength) {
        label += ' '.repeat(longestSizeLabelLength - length);
      }

      // Indent 4 spaces to align with Yarn's "Done in..." message
      console.log(`    ${label}  ${chalk.gray(asset.folder + path.sep)}${chalk.cyan(asset.name)}`);
    });

    console.log();
  }

  /**
   * Fired on Webpack's "compile" event.
   * Displays different startup messages depending on NODE_ENV.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isProduction
   * @param {boolean} isTTY
   * @param {boolean} isFirstCompile
   * @param {boolean} hasDevServer
   */
  handleCompile (isDevelopment, isProduction, isTTY, isFirstCompile, hasDevServer) {
    if (isTTY) {
      this.clearConsole();
    }

    // Only display this if the devServer property exists in the Webpack config
    // Only display it once, since afterwards you're no longer starting the server
    if (isDevelopment && hasDevServer && isFirstCompile) {
      if (isTTY === true) {
        this.ora.start('Starting the development server...');
      } else {
        console.log('Starting the development server...');
        console.log();
      }
    }

    if (isProduction) {
      if (isTTY) {
        this.ora.start('Creating an optimized production build...');
      } else {
        console.log('Creating an optimized production build...');
        console.log();
      }
    }
    // If not development or production mode, you'll just see "Compiling..."
  }

  /**
   * Fired on Webpack's "invalid" event.
   * Displays a brief message after saving changes to code.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isTTY
   * @param {boolean} isFirstCompile
   */
  handleInvalid (isDevelopment, isTTY, isFirstCompile) {
    if (isDevelopment && !isFirstCompile) {
      if (isTTY) {
        this.ora.stop();
        this.clearConsole();
        this.ora.start('Compiling');
      } else {
        console.log('Compiling...');
        console.log();
      }
    }
  }

  /**
   * Fired on Webpack's "done" event.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isProduction
   * @param {boolean} isTTY
   * @param {boolean} hasWarnings
   * @param {boolean} hasErrors
   * @param {boolean} hasDevServer
   * @param {boolean} shouldNotify
   * @param {object} messages - the return value of [formatWebpackMessages()]{@link FormatMessages#formatWebpackMessages}
   * @param {object} compiler - the Webpack compiler configuration object
   * @param {object} stats - the Webpack compilation stats object
   */
  handleDone (isDevelopment, isProduction, isTTY, hasWarnings, hasErrors, hasDevServer, shouldNotify, messages, compiler, stats) {
    const TITLE = 'Webpack';
    const MESSAGE_SUCCESS = 'Compiled successfully!';
    const MESSAGE_WARN = 'Compiled with warnings.';
    const MESSAGE_FAIL = 'Failed to compile.';
    const ICON = path.join(__dirname, 'icon', 'webpack.png');

    const isMac = os.platform() === 'darwin';
    const isLinux = os.platform() === 'linux';
    const isWindows = os.platform() === 'win32';

    let file;
    let message;

    if (isTTY) {
      this.ora.stop();
      this.clearConsole();
    }

    if (isDevelopment || isProduction) {
      // Success handler for both development and production modes
      if (!hasWarnings && !hasErrors) {
        if (isTTY) {
          this.ora.succeed(MESSAGE_SUCCESS);
        } else {
          console.log(MESSAGE_SUCCESS);
        }

        console.log();

        if (this.hasNotifications && shouldNotify) {
          notifier.notify({
            title: TITLE,
            message: MESSAGE_SUCCESS,
            contentImage: isMac ? ICON : null,
            icon: isLinux || isWindows ? ICON : null
          });
        }
      }

      // Display error message and code snippet where the error occurred
      if (hasErrors) {
        // Only keep the first error
        // Others are often indicative of the same problem, but confuse the reader with noise
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }

        if (isTTY) {
          this.ora.fail(MESSAGE_FAIL);
        } else {
          console.log(MESSAGE_FAIL);
        }

        console.log();
        console.log(messages.errors.join('\n\n'));
        console.log();

        file = stripAnsi(messages.errors[0].split('\n')[0]).split('/').slice(-1)[0];
        message = stripAnsi(messages.errors[0].split('\n')[1]).trim();

        // ESLint error
        if (message.startsWith('Line ')) {
          const error = message.split('  ')[1];
          const line = message.split('  ')[0].toLowerCase().slice(0, -1);

          message = `ESLint: ${error} (${line}) [${file}]`;
        } else {
          message = `${message} [${file}]`;
        }

        if (this.hasNotifications) {
          notifier.notify({
            title: TITLE,
            message: message,
            contentImage: isMac ? ICON : null,
            icon: isLinux || isWindows ? ICON : null
          });
        }
      }

      // Display linter warnings
      // Only show warnings if there were no errors
      if (hasWarnings && !hasErrors) {
        if (isTTY) {
          this.ora.warn(MESSAGE_WARN);
        } else {
          console.log(MESSAGE_WARN);
        }

        console.log();
        console.log(messages.warnings.join('\n\n'));
        console.log();

        file = stripAnsi(messages.warnings[0].split('\n')[0]).split('/').slice(-1)[0];
        message = stripAnsi(messages.warnings[0].split('\n')[1]).trim();

        // ESLint warning
        if (message.startsWith('Line ')) {
          const warning = message.split('  ')[1];
          const line = message.split('  ')[0].toLowerCase().slice(0, -1);

          message = `ESLint: ${warning} (${line}) [${file}]`;
        } else {
          message = `${message} [${file}]`;
        }

        if (this.hasNotifications) {
          notifier.notify({
            title: TITLE,
            message: message,
            contentImage: isMac ? ICON : null,
            icon: isLinux || isWindows ? ICON : null
          });
        }
      }
    }

    // Print instructions to view the app in the browser
    // Note: dev server will start even if there are warnings or errors
    if (isDevelopment && hasDevServer && !hasWarnings && !hasErrors) {
      const urls = this.prepareURLs(compiler);

      this.printInstructions(urls);
    }

    // Display sizes of each emitted file
    // Warnings do not cause Webpack to abort the build, so we will still show build results
    if (isProduction && !hasErrors) {
      this.printFileSizesAfterBuild(compiler, stats);
    }
  }

  /**
   * Stops any active spinner, clears the console, and kills the process.
   *
   * Build success:      code === 0 && signal === null
   * Build syntax error: code === 2 && signal === null
   * Build bail:         code === 1 && signal === null
   * ESLint error:       code === 2 && signal === null
   * ESLint warning:     code === 0 && signal === null
   * Build SIGINT:       code === 0 && signal === SIGINT
   * Dev SIGINT:         code === 0 && signal === null
   *
   * @param {boolean} isProduction
   * @param {boolean} isTTY
   * @param {number} code - See {@link https://nodejs.org/api/process.html#process_exit_codes}
   * @param {string} signal - The kill signal
   */
  handleExit (isProduction, isTTY, code, signal) {
    const isSIGINT = signal === 'SIGINT';

    if (isTTY) {
      this.ora.stop();
    }

    // Don't clear the console after a build unless you CTRL-C while compiling
    if (!isProduction && isTTY && !isSIGINT) {
      this.clearConsole();
    }
  }
}

module.exports = FormatMessages;
