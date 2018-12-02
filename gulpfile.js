
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var uglifycss = require('gulp-uglifycss');
var fs = require('fs');
var runSequence = require('run-sequence');
var del = require('del');
const babel = require('gulp-babel');

// var pump = require('pump');
// gulp.task('uglify-error-debugging', function (cb) {
//   pump([
//     gulp.src('./dist/*.js'),
//     uglify(),
//     gulp.dest('./dist/')
//   ], cb);
// });

// gulp.task('transcompile', function() {
//   return gulp.src('./dist/bundle.js')
//     .pipe(babel({
//       presets: ['env']
//     }))
//     .pipe(gulp.dest('./dist/'));
// });


gulp.task('cleanBuild', function () {
  return del(['dist/**/*']);
});

gulp.task('minifyCss', function(callback) {
  return gulp.src('./src/*.css')
    .pipe(concat('bundle.min.css'))
    .pipe(uglifycss())
    .pipe(gulp.dest('./dist/'))
});

gulp.task('concatJs', function() {
  return gulp.src([
    './src/*.js',
  ])
  .pipe(concat('bundle.js'))
  .pipe(babel({
    presets: ['env']
  }))
  .pipe(gulp.dest('./dist/'))
});

gulp.task('injectCss', function() {
  return gulp.src('./dist/bundle.js')
    .pipe(replace(/@import "main.css"/, function(s) {
      var style = fs.readFileSync('./dist/bundle.min.css', 'utf8');
      return style;
    }))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('uglifyJs', function() {
  return gulp.src('./dist/*.js')
    .pipe(concat('bundle.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('moveHtmlFile', function() {
  return gulp.src('./src/*.html')
    .pipe(replace(/index.js/, 'bundle.min.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('moveAssets', function() {
  return gulp.src('./src/assets/*')
    .pipe(gulp.dest('./dist/assets/'));
});

gulp.task('bundle', function() {
  runSequence('cleanBuild', 'minifyCss', 'concatJs', 'injectCss', 'uglifyJs', 'moveHtmlFile', 'moveAssets');
});
