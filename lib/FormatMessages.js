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
const path = require('path');
const stripAnsi = require('strip-ansi');
const url = require('url');

// TODO: Add conditionals to display notifications
// TODO: Add Webpack icon to notifications
class FormatMessages {
  constructor () {
    this.ora = ora();
    this.handleCompile = this.handleCompile.bind(this);
    this.handleInvalid = this.handleInvalid.bind(this);
    this.handleDone = this.handleDone.bind(this);
    this.handleExit = this.handleExit.bind(this);
  }

  /**
   * Checks if a yarn.lock file exists in the current directory.
   *
   * @return {boolean}
   */
  hasYarn () {
    return fs.existsSync(path.join(__dirname, 'yarn.lock'));
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
    const buildScript = this.hasYarn()
      ? `${chalk.cyan('yarn')} build`
      : `${chalk.cyan('npm run')} build`;

    let name;

    // Get the package name
    // Throws if package.json doesn't exist in the same folder as the Webpack config
    try {
      name = require('./package.json').name;
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
    console.log('Note that the development build is not optimized.');
    console.log(`To create a production build, use ${buildScript}.`);
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
    let suggestBundleSplitting = false;

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
      let isMainBundle;
      let maxRecommendedSize;
      let isLarge;
      let label = asset.label;

      // Get the length of the label
      length = stripAnsi(label).length;

      // Adds spaces so the finished output is aligned
      if (length < longestSizeLabelLength) {
        label += ' '.repeat(longestSizeLabelLength - length);
      }

      // Your main entry should be called "main"
      isMainBundle = asset.name.startsWith('main.');

      // Your main bundle should be no greater than 500Kb
      // Each chunk should be no greater than 1Mb
      maxRecommendedSize = isMainBundle
        // max bundle gzip size
        ? 524288
        // max chunk gzip size
        : 1048576;

      // Determine if the asset exceeds the maximum recommended size
      isLarge = maxRecommendedSize && asset.size > maxRecommendedSize;

      // If you emit a huge JavaScript file, suggest code splitting
      if (isLarge && path.extname(asset.name) === '.js') {
        suggestBundleSplitting = true;
      }

      // Indent 3 spaces to align with Yarn's "Done in..." message
      console.log(`   ${isLarge ? chalk.yellow(label) : label}  ${chalk.gray(asset.folder + path.sep)}${chalk.cyan(asset.name)}`);
    });

    if (suggestBundleSplitting) {
      console.log();
      console.log(chalk.yellow('The bundle size is significantly larger than recommended.'));
      console.log(chalk.yellow('Consider reducing it with code splitting: https://goo.gl/9VhYWB'));
      console.log(chalk.yellow('You can also analyze the project dependencies: https://goo.gl/LeUzfb'));
    }

    console.log();
  }

  /**
   * Fired on Webpack's "compile" event.
   * Displays different startup messages depending on NODE_ENV.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isProduction
   * @param {boolean} hasDevServer
   * @param {boolean} isFirstCompile
   */
  handleCompile (isDevelopment, isProduction, hasDevServer, isFirstCompile) {
    this.clearConsole();

    // Only display this if the devServer property exists in the Webpack config
    // Only display it once, since afterwards you're no longer starting the server
    if (isDevelopment && hasDevServer && isFirstCompile) {
      this.ora.start('Starting the development server...');
    }

    if (isProduction) {
      this.ora.start('Creating an optimized production build...');
    }
    // If not development or production mode, you'll just see "Compiling..."
  }

  /**
   * Fired on Webpack's "invalid" event.
   * Displays a brief message after saving changes to code.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isFirstCompile
   */
  handleInvalid (isDevelopment, isFirstCompile) {
    if (isDevelopment && !isFirstCompile) {
      this.ora.stop();
      this.clearConsole();
      this.ora.start('Compiling');
    }
  }

  /**
   * Fired on Webpack's "done" event.
   *
   * @param {boolean} isDevelopment
   * @param {boolean} isProduction
   * @param {boolean} isFirstCompile
   * @param {boolean} hasWarnings
   * @param {boolean} hasErrors
   * @param {boolean} hasDevServer
   * @param {object} messages - the return value of [formatWebpackMessages()]{@link FormatMessages#formatWebpackMessages}
   * @param {object} compiler - the Webpack compiler configuration object
   * @param {object} stats - the Webpack compilation stats object
   */
  handleDone (isDevelopment, isProduction, isFirstCompile, hasWarnings, hasErrors, hasDevServer, messages, compiler, stats) {
    this.ora.stop();
    this.clearConsole();

    if (isDevelopment || isProduction) {
      // Success handler for both development and production modes
      if (!hasWarnings && !hasErrors && isFirstCompile) {
        this.ora.succeed('Compiled successfully!');

        console.log();

        notifier.notify({
          title: 'Webpack',
          message: 'Compiled successfully!'
        });
      }

      // Display error message and code snippet where the error occurred
      if (hasErrors) {
        // Only keep the first error
        // Others are often indicative of the same problem, but confuse the reader with noise
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }

        this.ora.fail('Failed to compile.');

        console.log();
        console.log(messages.errors.join('\n\n'));
        console.log();

        notifier.notify({
          title: 'Webpack',
          subtitle: 'Failed to compile.',
          message: stripAnsi(messages.errors[0].split('\n')[1])
        });
      }

      // Display linter warnings and tips on how to fix them
      // Only show warnings if there were no errors
      if (!hasErrors && hasWarnings) {
        this.ora.warn('Compiled with warnings.');

        console.log();
        console.log(messages.warnings.join('\n\n'));
        console.log();

        notifier.notify({
          title: 'Webpack',
          subtitle: 'Compiled with warnings',
          message: stripAnsi(messages.warnings[0].split('\n')[1])
        });
      }
    }

    // Print instructions to view the app in the browser
    // Dev server will start even if there are errors or warnings
    if (isDevelopment && hasDevServer) {
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
   * Build success: code === 0 && signal === null
   * Build fail: code === 2 && signal === null
   * Build ESLint error: code === 2 && signal === null
   * Build ESLint warning: code === 0 && signal === null
   * Build SIGINT (CTRL-C): code === 0 && signal === SIGINT
   * Dev Server SIGINT: code === 0 && signal === null
   */
  handleExit (_, signal) {
    this.ora.stop();

    // Don't clear the console after a build
    if (process.env.NODE_ENV !== 'production' && signal !== 'SIGINT') {
      this.clearConsole();
    }
  }
}

module.exports = FormatMessages;
