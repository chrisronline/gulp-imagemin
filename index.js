'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var assign = require('object-assign');
var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var Imagemin = require('imagemin');
var os = require('os');
var async = require('async');

function minify(file, options, totalBytes, totalSavedBytes, totalFiles, cb) {
	var imagemin = new Imagemin()
		.src(file.path)
		.use(Imagemin.gifsicle({interlaced: options.interlaced}))
		.use(Imagemin.jpegtran({progressive: options.progressive}))
		.use(Imagemin.optipng({optimizationLevel: options.optimizationLevel}))
		.use(Imagemin.svgo({plugins: options.svgoPlugins || []}));

	if (options.use) {
		options.use.forEach(imagemin.use.bind(imagemin));
	}

	imagemin.run(function (err, results) {
		if (err) {
			cb(new gutil.PluginError('gulp-imagemin:', err, {fileName: file.path}));
			return;
		}

		var data = results.shift();
		var originalSize = file.contents.length;
		var optimizedSize = data.contents.length;
		var saved = originalSize - optimizedSize;
		var percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
		var savedMsg = 'saved ' + prettyBytes(saved) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%';
		var msg = saved > 0 ? savedMsg : 'already optimized';

		totalBytes += originalSize;
		totalSavedBytes += saved;
		totalFiles++;

		if (options.verbose) {
			gutil.log('gulp-imagemin:', chalk.green('✔ ') + file.relative + chalk.gray(' (' + msg + ')'));
		}

		file.contents = data.contents;
		cb(null, file);
	});
}

var plugin = function(options) {
	options = assign({}, options || {});
	options.verbose = process.argv.indexOf('--verbose') !== -1;

	var totalBytes = 0;
	var totalSavedBytes = 0;
	var totalFiles = 0;
	var validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-imagemin', 'Streaming not supported'));
			return;
		}

		if (validExts.indexOf(path.extname(file.path).toLowerCase()) === -1) {
			if (options.verbose) {
				gutil.log('gulp-imagemin: Skipping unsupported image ' + chalk.blue(file.relative));
			}

			cb(null, file);
			return;
		}

		console.log(new Date().getTime(), 'processing file sync', file.path);
		minify(file, options, totalBytes, totalSavedBytes, totalFiles, function(err, file) {
			console.log(new Date().getTime(), 'processing file sync', file.path);
			cb(err, file);
		});
	}, function (cb) {
		var percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;
		var msg = 'Minified ' + totalFiles + ' ';

		msg += totalFiles === 1 ? 'image' : 'images';
		msg += chalk.gray(' (saved ' + prettyBytes(totalSavedBytes) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%)');

		gutil.log('gulp-imagemin:', msg);
		cb();
	});
};

plugin.async = function(options) {
	options = assign({}, options || {});
	options.verbose = process.argv.indexOf('--verbose') !== -1;

	var validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
	var files = [];
	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-imagemin', 'Streaming not supported'));
			return;
		}

		if (validExts.indexOf(path.extname(file.path).toLowerCase()) === -1) {
			if (options.verbose) {
				gutil.log('gulp-imagemin: Skipping unsupported image ' + chalk.blue(file.relative));
			}

			cb(null, file);
			return;
		}

		files.push(file);
		cb(null, file);
	}, function (cb) {
		var self = this;
		var totalBytes = 0;
		var totalSavedBytes = 0;
		var totalFiles = 0;
		async.eachLimit(files, os.cpus().length, function (file, next) {
			console.log(new Date().getTime(), 'processing file async', file.path);
			minify(file, options, totalBytes, totalSavedBytes, totalFiles, function(err, file) {
				console.log(new Date().getTime(), 'processing file async', file.path);
				if (err) {
					cb(new gutil.PluginError('gulp-imagemin:', err, {fileName: file.path}));
					return;
				}
				self.push(file);
				next();
			});
		}, function() {
			var percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;
			var msg = 'Minified ' + totalFiles + ' ';

			msg += totalFiles === 1 ? 'image' : 'images';
			msg += chalk.gray(' (saved ' + prettyBytes(totalSavedBytes) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%)');

			gutil.log('gulp-imagemin:', msg);
			cb();
		});
	});
};

module.exports = plugin;