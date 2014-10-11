'use strict';
var fs = require('fs');
var assert = require('assert');
var gutil = require('gulp-util');
var pngquant = require('imagemin').pngquant;
var imagemin = require('./');
var testSize;

var useAsync = true;
if (useAsync) {
	imagemin = imagemin.async;
}

it('should minify images', function (cb) {
	this.timeout(40000);

	var stream = imagemin({
		optimizationLevel: 0
	});

	var files = [];
	stream.on('data', function (file) {
		files.indexOf(file) === -1 && files.push(file);
	});

	stream.on('end', function() {
		files.forEach(function(file) {
			testSize = file.contents.length;
			console.log(file.path, fs.statSync(file.path).size, file.contents.length);
			assert(file.contents.length < fs.statSync(file.path).size);
		});
		cb();
	});

	stream.write(new gutil.File({
		path: __dirname + '/fixture.png',
		contents: fs.readFileSync('fixture.png')
	}));

	stream.write(new gutil.File({
		path: __dirname + '/a.png',
		contents: fs.readFileSync('a.png')
	}));
	stream.write(new gutil.File({
		path: __dirname + '/b.png',
		contents: fs.readFileSync('b.png')
	}));
	stream.write(new gutil.File({
		path: __dirname + '/c.png',
		contents: fs.readFileSync('c.png')
	}));
	stream.write(new gutil.File({
		path: __dirname + '/d.png',
		contents: fs.readFileSync('d.png')
	}));

	stream.end();
});

it('should have configure option', function (cb) {
	this.timeout(40000);

	var stream = imagemin({
		use: [pngquant()]
	});

	stream.once('data', function (file) {
		assert(file.contents.length < testSize);
	});

	stream.on('end', cb);

	stream.write(new gutil.File({
		path: __dirname + '/fixture.png',
		contents: fs.readFileSync('fixture.png')
	}));

	stream.end();
});

it('should skip unsupported images', function (cb) {
	var stream = imagemin();

	stream.once('data', function (file) {
		assert.strictEqual(file.contents, null);
	});

	stream.on('end', cb);

	stream.write(new gutil.File({
		path: __dirname + '/fixture.bmp'
	}));

	stream.end();
});
