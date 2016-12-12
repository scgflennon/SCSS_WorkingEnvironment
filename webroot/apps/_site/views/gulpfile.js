var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var gulpWatch = require('gulp-watch');
var runSequence = require('run-sequence');
var del = require('del');
var browserSync = require('browser-sync').create();

var frontNote = require('gulp-frontnote');
var concat = require("gulp-concat");

var reload        = browserSync.reload;


/*

	■ Node.jsのインストール

		[確認]
		1.既にNodeを使ったことがあるMacまたはWindowsの場合はGulpインストールに進む
		2.コンソールまたはCMDにnode -vをしてバージョンが出る場合はnodeインストール済みなのでGulpインストールに進む

		[Mac]
		1. ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)" ← Mac用のパッケージマネージャーをインストール
		2. brew update
			 brew install nodebrew
		3. nodebrew install latest
		4. nodebrew list ← Nodeのバージョン確認
		5. nodebrew use v0.11.13 ← 利用するNode.jsのバージョンを有効にする
		6. echo 'export PATH=$PATH:/Users/ユーザー名/.nodebrew/current/bin' >> ~/.bashrc ← パスの設定
		7. node -v ← Node.jsのバージョン確認

		[Windows]
		1. 管理者権限でコマンドプロンプトを起動
		2. @powershell -NoProfile -ExecutionPolicy unrestricted -Command "iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))" && SET PATH=%PATH%;%systemdrive%\chocolatey\bin　← パッケージをインストールするための下準備
		3. cinst nodejs.install ← 環境変数に新しく追加されるものがあるので、一度コマンドプロンプトを閉じる。そして、また管理者権限で起動したコマンドプロンプト実行
		4. node -v ←バージョン確認

	■ Gulpの初回インストール方法
	1. npm install -g gulp ←グローバルにインストール (Macだとsudoが必要)
	2. npm install gulp --save-dev ←ローカルにインストール
	3. npm install　← パッケージのインストール

	■ グローバルにGulpインストール済みMacまたはWindowsの場合
	1. npm install gulp --save-dev
	2. npm install ← パッケージのインストール

	■csscssを使う場合は下記を実行
	gem install csscss

	■ Gulp 使い方(通常時)
	1,ターミナルを起動してプロジェクトまで移動する
	cd /Applications/XAMPP/xamppfiles/htdocs/jp_cb2web/webroot/apps/_site/views

	2,Gulpのデフォルトタスクの起動(開発用)
	gulp

	3,ブラウザが立ち上がるのでHTMLやscssの作業をする、保存のたびにGulpのタスクが走る

	4,サーバーにアップ用のファイル生成タスクを実行
	gulp prod


	Nodeのバージョンアップ方法
	 ■ Mac
	 nodebrew ls-all
	 nodebrew install-binary v5.5.0
	 nodebrew use v5.5.0


	 ■Windows
		nodist dist
		nodist add nodev5.5.0
		nodist nodev5.5.0
*/

//config
var $sass_mode = '1'; //[Compass(0), node-sass(1), stylus(2)] 特に指定が無いならばnode-sassが高速なので推奨
var $sassOutputStyle = 'compressed'; //compressed or compact

var config = {
	'url' : {
		'local'		:	'jp.toreba2d.localhost.des' //ローカルテストサーバーのURLを設定
	},
	'path' : {
		'sass'		: 'sass',
		'stylus'	: 'stylus',
		'css'			: 'css',
		'js'			: 'js',
		'images'	: 'images',
		'sprite'  : 'sprite',
		'temp'		:	'temp'
	}
};

gulp.task('default-sass', function(callback) {
	return runSequence(
		['sass_sequence-dev','js'],
		//['webp'],
		['frontnote','gzip','js-gzip'],
		//['csscss']
		['bs-reload'],
		callback
	);
});

gulp.task('prod', function(callback){
	return runSequence(
		['clean-prod','sass_sequence','js','sprite'],
		['imagemin','ple'],
		['gzip','webp','frontnote'],
		['bs-reload'],
		callback
	);
});

gulp.task("default", function() {
	console.log( '---------- default task ----------' );

	console.log( '---------- browserSync task ----------' );
	browserSync.init({
		proxy: config.url.local
	});

	if ($sass_mode == '0'){
		console.log( '---------- Compass Watch task ----------' );
		gulp.watch(config.path.sass+'/**/*.scss', {interval: 500},['compass']); // ruby-sass
	} else if ($sass_mode == '1') {
		console.log( '---------- Sass Watch task ----------' );
		gulpWatch([
			config.path.sass + '/**/*.scss',
			config.path.js + '/**/*.js',
			'!' + config.path.js + '/min/*.js',
		],function() {
			gulp.start('default-sass');
		});
	} else if ($sass_mode == "2"){
		console.log( '---------- stylus Watch task ----------' );
		gulpWatch([config.path.stylus+'/**/*.styl'], function() {
			gulp.start('stylus');
		});
	}

	gulpWatch(['./**/*.php','./**/*.html'], function() {
		gulp.start('bs-reload');
	});

//	gulpWatch(['./images/sprite/**/*.png'], function() {
//		gulp.start('sprite');
//	});

	//gulp.watch(["./**/*.php","./**/*.html"], {interval: 1000}, ["bs-reload"]);
	//gulp.watch(["./images/sprite/**/*.png"], {interval: 3000}, ["sprite"]);
});

gulp.task("sass_sequence", function() {
	console.log( '---------- sass task ----------' );
	return gulp.src(config.path.sass+"/**/*.scss")
		.pipe(plumberWithNotify())
		.pipe($.sass({outputStyle: $sassOutputStyle})) //compressed or compact
		.pipe(gulp.dest(config.path.css));
});

gulp.task("sass_sequence-dev", function() {
	console.log( '---------- sass task ----------' );
	return gulp.src(config.path.sass+"/**/*.scss")
		.pipe(plumberWithNotify())
		.pipe($.sourcemaps.init())
		.pipe($.sass({outputStyle: $sassOutputStyle})) //compressed or compact
		.pipe($.pleeease({
			autoprefixer: {
				browsers: [
					'last 3 versions',
					'ie >= 8',
					'iOS >= 6',
					'Android >= 3'
				]//プレフィックスを付与するバージョンを指定
			},
			minifier: false//圧縮を有効に false or true
		}))
		.pipe($.sourcemaps.write('.', {includeContent: false}))
		.pipe(gulp.dest(config.path.css));
});

//csscss
// CSSCSSはCSSプロパティの重複を教えてくれるアプリケーション（gem）です。
gulp.task('csscss', function(callback){
	gulp.src(config.path.css + '/**/*.css')
		.pipe($.csscss());
	callback();
});

gulp.task('frontnote', function(callback){
	gulp.src(config.path.css + '/**/*.css')
		.pipe(frontNote({
			out: './sass/docs'
		}));
	callback();
});


// task.sprite
gulp.task('sprite', function(callback) {
	// set target folders
	var folders = getFolders(dir.source + '/' + dir.img + '/sprite/');

	// generate image & sass files
	folders.map(function(folder) {
		var spriteData = gulp.src('sprite/' + folder + '/*.png', {cwd: dir.source + '/' + dir.img})
		.pipe($.changed('dist'))
		.pipe($.cached('sprite'))
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.spritesmith({
			imgName:   'sprite-' + folder + '.png',
			imgPath:   '../' + dir.img + '/sprite-' + folder + '.png',
			cssName:   '_' + folder + '.scss',
			algorithm: 'binary-tree', // binary-tree , diagonal
			padding:   3,
			cssFormat: 'scss'
		}));
		spriteData.img.pipe(gulp.dest(dir.source + '/' + dir.img));
		spriteData.css.pipe(gulp.dest(dir.source + '/' + dir.scss + '/' + dir.sprite));
	});
	callback();
});

gulp.task("sass", function() {
	console.log( '---------- sass task ----------' );
	return gulp.src(config.path.sass+"/**/*.scss")
		.pipe($.changed('dist'))
		.pipe($.cached('sass'))
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.sourcemaps.init())
		.pipe($.sass({outputStyle: $sassOutputStyle})) //compressed or compact
		.pipe($.minifyCss({advanced:false}))
		.pipe($.sourcemaps.write('./maps'))
		.pipe(gulp.dest(config.path.css));
		gulp.src(config.path.css+"/**/*.css")
		.pipe($.gzip())
		.pipe(gulp.dest(config.path.css));
});

gulp.task('gzip', function() {
	return gulp.src([
			config.path.css + "/**/*.css"
		])
		.pipe($.changed('dist'))
		.pipe($.cached('gzip'))
		.pipe($.gzip())
		.pipe(gulp.dest(config.path.css));
});

gulp.task('sourcemap', function() {
	console.log( '---------- sourcemap task ----------' );
	return gulp.src(config.path.sass + '/**/*.scss')
		.pipe($.changed('dist'))
		.pipe($.plumber()) //タスク強制停止防止
		.pipe($.sourcemaps.init())
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(config.path.css))
});


gulp.task('stylus', function() {
	console.log( '---------- stylus task ----------' );
	return gulp.src(config.path.stylus+'/**/*.styl')
		.pipe($.changed('dist'))
		.pipe($.cached('stylus'))
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.sourcemaps.init())
		.pipe($.stylus({ compress: true }))
		.pipe($.sourcemaps.write( '.' ))
		.pipe(gulp.dest(config.path.css))
});

gulp.task("js", function(callback) {
	console.log( '---------- Javascript task ----------' );
	gulp.src([
		config.path.js + '/scripts/**/*.js',
		config.path.js + '/**/*.js',
		"!" + config.path.js + '/min/**/*.js',
	])
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.uglify())
		.pipe(concat('build.js'))
		.pipe(gulp.dest(config.path.js +'/min'));
	callback();
});

gulp.task('js-gzip', function(callback){
	gulp.src([
		config.path.js + '/min/build.js',
	])
		.pipe($.using())
		.pipe($.gzip())
		.pipe(gulp.dest(config.path.js + '/min'));
	callback();
});

// //config.path.js +'/build/all.js',
// gulp.task("js", function(callback) {
// 	console.log( '---------- Javascript task ----------' );
// 	gulp.src([
// 		config.path.js+'/temp/build.js'
// 		// config.path.js+"/**/*.js",
// 		// "!"+config.path.js+"/min/**/*.js",
// 		// "!"+config.path.js+"/temp/**/*.js",
// 		// "!"+config.path.js+"/scripts/**/*.js"
// 	])
// 		.pipe($.changed('dist'))
// 		.pipe($.cached('js'))
// 		.pipe(plumberWithNotify())
// 		.pipe($.uglify())
// 		.pipe(gulp.dest(config.path.js+'/min'))
// 		callback();
// });
//
// gulp.task('jsconcat', function(callback) {
// 	console.log( '---------- Javascript Concat task ----------' );
// 	gulp.src([
// 		config.path.js + '/scripts/*.js'
// 	])
// 		.pipe($.using())
// 		.pipe(concat('temp.js'))
// 		.pipe(gulp.dest(config.path.js +'/temp'));
//
// 	gulp.src([
// 		config.path.js + '/temp/temp.js',
// 		config.path.js+"/**/*.js"
// 	])
// 		.pipe($.using())
// 		.pipe(concat('build.js'))
// 		.pipe(gulp.dest(config.path.js+'/temp'));
// 		callback();
// });


// gulp.task('js1',function(callback){
// 	gulp.src([
// 		config.path.js + '/scripts/*.js'
// 	])
// 		.pipe(plumberWithNotify())
// 		.pipe(concat('temp.js'))
// 		.pipe(gulp.dest(config.path.js +'/temp'))
// 	callback();
// });
//
// gulp.task('js2',function(callback){
// 	gulp.src([
// 		config.path.js + '/temp/temp.js',
// 		config.path.js + '/**/*.js'
// 	])
// 		.pipe(plumberWithNotify())
// 		.pipe(concat('build.js'))
// 		.pipe(gulp.dest(config.path.js+'/temp'))
// 	callback();
// });
//
// gulp.task('js3',function(callback){
// 	gulp.src([
// 		config.path.js + '/temp/build.js'
// 	])
// 		.pipe(plumberWithNotify())
// 		.pipe($.uglify())
// 		.pipe(gulp.dest(config.path.js+'/min'))
// 	callback();
// });

gulp.task('webp', function() {
	return gulp.src([
		config.path.images+'/**/*.+(jpg|jpeg|png|gif)',
		'!' + config.path.images + '/sprite/**/*.png',
		'!' + config.path.images + '/min/**/*.+(jpg|jpeg|png|gif)'
	])
		.pipe($.changed('dist'))
		.pipe($.cached('webp'))
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.webp())
		.pipe(gulp.dest(config.path.images))
});

gulp.task('imagemin', function(callback) {
	var srcGlob = [
		config.path.images + '/**/*.+(jpg|jpeg|png|gif|svg)',
		'!'+config.path.images + '/sprite/**/*.png', '!'+config.path.images + '/min/**/*.+(jpg|jpeg|png|gif|svg)'
	];
	var dstGlob = 'images/min';
	var imageminOptions = {
		optimizationLevel: 7,
		progressive: true,
		interlaced: true
	};

	gulp.src(srcGlob)
	.pipe($.using())
	.pipe(plumberWithNotify())
	.pipe($.imagemin( imageminOptions ))
	.pipe(gulp.dest( dstGlob ))
	callback();
});

gulp.task('compass', function() {
	return gulp.src(config.path.sass+'/**/*.scss')
		.pipe($.changed('dist'))
		.pipe($.cached('compass'))
		.pipe($.using())
		.pipe(plumberWithNotify())
		.pipe($.compass({
			config_file: './config.rb',
			css: 'css',
			sass: 'sass'
		}))
		.pipe(gulp.dest(config.path.css))
});

gulp.task('ple', function() {
	console.log( '---------- ple task ----------' );
	return gulp.src(config.path.css + '/*.css')
		.pipe($.changed('dist'))
		.pipe($.plumber()) //タスク強制停止防止
		.pipe($.pleeease({
			autoprefixer: {
				browsers: [
					'last 3 versions',
					'ie >= 8',
					'iOS >= 6',
					'Android >= 3'
				]//プレフィックスを付与するバージョンを指定
			},
			minifier: false//圧縮を有効に false or true
		}))
		.pipe(gulp.dest(config.path.css))
});

function plumberWithNotify() {
	return $.plumber({
		errorHandler: $.notify.onError("<%= error.message %>")
	});
}

// load Node.js API
var fs   = require('fs'),
		path = require('path');

var dir  = {
	source: '.',
	scss:   'sass',
	img:    'images',
	sprite: 'sprite'
};

// function.getFolders
var getFolders = function(dir) {
	return fs.readdirSync(dir)
	.filter(function(file) {
	return fs.statSync(path.join(dir, file)).isDirectory();
	});
};

gulp.task('browser-sync', function() {
//プロクシサーバー経由でテストサーバーを起動
	browserSync.init({
		proxy: config.url.local
	});
});

gulp.task('bs-reload', function(callback) {
	browserSync.reload();
	callback();
});

//ファイルの削除
gulp.task('clean-dev', function(cb) {
	del([
		'js/temp',
		'**/.DS_Store'
	], cb);
});

//ファイルの削除
gulp.task('clean-prod', function(cb) {
	del([
		'css/**/*.map',
		'**/.DS_Store'
	], cb);
});

gulp.task('test', function() {
	console.log( '-------------------------------' );
	console.log( '           Gulp Test           ' );
	console.log( '-------------------------------' );
	console.log('LocalServer : http://'+config.url.local);
	console.log( '-----------Sass Mode-----------' );
	console.log('SassMode : '+ $sass_mode + ' [Compass(0), node-sass(1), stylus(2)]');
	console.log('OutputStyle : '+ $sassOutputStyle + '【compressed or compact】');
	console.log( '-----------Path Test-----------' );
	console.log("Sass : " + config.path.sass);
	console.log("Stylus : " + config.path.stylus);
	console.log("Css : " + config.path.css);
	console.log("JS : " + config.path.js);
	console.log("images : " + config.path.images);
	console.log("sprite : " + config.path.sprite);
	console.log( '-------------------------------' );
});
