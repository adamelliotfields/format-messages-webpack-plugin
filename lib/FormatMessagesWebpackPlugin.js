const onDeath = require('death');

const FormatMessages = require('./FormatMessages');

class FormatMessagesWebpackPlugin extends FormatMessages {
  constructor () {
    super();
    this.isSuccessful = false;
    this.isFirstCompile = true;
  }

  apply (compiler) {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    const isProduction = process.env.NODE_ENV === 'production';
    const isCI = process.env.CI && (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false');

    let hasDevServer;

    if (compiler.options.devServer) {
      hasDevServer = true;
    }

    compiler.plugin('compile', () => {
      this.handleCompile(isDevelopment, isProduction, hasDevServer, this.isFirstCompile);
    });

    compiler.plugin('invalid', () => {
      // Reset isSuccessful
      this.isSuccessful = false;

      this.handleInvalid(isDevelopment, this.isFirstCompile);
    });

    compiler.plugin('done', (stats) => {
      const messages = this.formatWebpackMessages(stats);

      // Set isSuccessful
      if (!messages.errors.length && !messages.warnings.length) {
        this.isSuccessful = true;
      }

      this.handleDone(
        isDevelopment,
        isProduction,
        isCI,
        hasDevServer,
        this.isSuccessful,
        this.isFirstCompile,
        messages,
        compiler,
        stats
      );

      // Set isFirstCompile to false if successful
      if (this.isSuccessful && this.isFirstCompile) {
        this.isFirstCompile = false;
      }
    });

    // Handles SIGINT, SIGTERM, and SIGQUIT kill signals
    onDeath(() => {
      this.handleDeath();
    });

    return compiler;
  }
}

module.exports = FormatMessagesWebpackPlugin;
