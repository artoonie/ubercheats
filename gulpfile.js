// Copied from https://gist.github.com/jeromecoupe/0b807b0c1050647eb340360902c3203a
'use strict';

// Load plugins
const zip = require('gulp-zip');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const del = require('del');
const eslint = require('gulp-eslint');
const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const newer = require('gulp-newer');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const webpack = require('webpack');
const webpackconfig = require('./webpack.config.js');
const webpackstream = require('webpack-stream');
const jest = require('gulp-jest').default;

// Clean assets
function clean() {
  return del(['./_site/assets/']);
}

// Test
function test() {
    return gulp.src('./test').pipe(jest({
      'preprocessorIgnorePatterns': [
        '<rootDir>/dist/', '<rootDir>/node_modules/'
      ],
      'automock': false,
      'coverage': true,
      'type': 'module'
    }));
}

// Optimize Images
function images() {
  return gulp
    .src('./assets/images/**/*')
    .pipe(newer('./_site/assets/img'))
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.mozjpeg({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            {
              removeViewBox: false,
              collapseGroups: true
            }
          ]
        })
      ])
    )
    .pipe(gulp.dest('./_site/assets/img'));
}

function zip_package() {
    return gulp.src('./_site/assets/*')
      .pipe(zip('ubercheats.zip'))
      .pipe(gulp.dest('dist'));
}

// CSS task
function css() {
  return gulp
    .src('./assets/scss/**/*.scss')
    .pipe(plumber())
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(gulp.dest('./_site/assets/css/'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(gulp.dest('./_site/assets/css/'))
}

// Lint scripts
function scriptsLint() {
  return gulp
    .src(['./app/js/**/*', './gulpfile.js'])
    .pipe(plumber())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

// Transpile, concatenate and minify scripts
function scripts() {
  return (
    gulp
      .src(['./app/js/**/*'])
      .pipe(plumber())
      // .pipe(webpackstream(webpackconfig, webpack)) // There's probably a good way to bundle this but that's for later.
      // folder only, filename is specified in webpack config
      .pipe(gulp.dest('./_site/assets/js/'))
  );
}

function chromefiles() {
  return (
    gulp
      .src(['./app/manifest.json', './app/popup.html'])
      .pipe(gulp.dest('./_site/assets/'))
  )
}

// define complex tasks
const js = gulp.series(scriptsLint, scripts);
const build = gulp.series(clean, test, gulp.parallel(chromefiles, css, images, js));
const pack = gulp.series(clean, build, zip_package)

// export tasks
exports.images = images;
exports.css = css;
exports.js = js;
exports.clean = clean;
exports.build = build;
exports.default = build;
exports.package = pack
exports.test = test