var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var run = require('gulp-run');

var cssOutput = './views/index/css';
var paths = {
  scss: 'views/**/*.scss',
  views: ['views/**/*.*', '!views/*.json', '!views/index.html', '!views/**/*.scss']
};

function compileViews () {
  run('./views/compileviews.sh').exec();
}

gulp.task('styles', function () {
  return gulp.src(paths.scss)
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('styles.css'))
    .pipe(gulp.dest(cssOutput));
});

gulp.task('default', ['styles'], function () {
  gulp.watch(paths.scss, ['styles']);
  gulp.watch(paths.views, compileViews);
});
