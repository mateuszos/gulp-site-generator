(function () {
    'use strict';

    var compileRss = require('../lib/compile-rss'),
        removeDir = require('../lib/remove-dir'),
        expect = require('chai').expect,
        mockery = require('mockery'),
        sinon = require('sinon'),
        fs = require('fs');

    describe('Given the RSS feed', function() {
        var rootPath = '/tmp/compile-rss';
        var doneStub, errorStub;

        before(function () {
            doneStub = sinon.stub();
            errorStub = sinon.stub();

            // create the root path
            if (!fs.existsSync(rootPath)) {
                fs.mkdirSync(rootPath);
            }

            // set-up folders:
            [
                '/build',
                '/build/content',
                '/build/content/pages',
                '/build/content/posts'
            ].forEach(function (dir) {
                    if (!fs.existsSync(rootPath + dir)) {
                        fs.mkdirSync(rootPath + dir);
                    }
                });

            // set-up files:
            fs.writeFileSync(rootPath + '/site.json', '{"title":"Test site"}', {encoding: 'utf8'});
        });

        describe('When compiling the rss feed', function () {
            before(function (done) {
                fs.writeFileSync(rootPath + '/build/content/pages/test-page.json', '{"slug":"test-page","title":"Test page","template":"page.hbs","body":"<p>Test page content</p>"}', {encoding: 'utf8'});
                fs.writeFileSync(rootPath + '/build/content/posts/test-post1.json', '{"slug":"test-post1","title":"Test post 1","template":"post.hbs","date":"2015-01-10","body":"<p>Test post content</p>"}', {encoding: 'utf8'});
                fs.writeFileSync(rootPath + '/build/content/posts/test-post2.json', '{"slug":"test-post2","title":"Test post 2","template":"post.hbs","date":"2015-01-20","body":"<p>Test post content</p>"}', {encoding: 'utf8'});
                compileRss.run(rootPath, done, errorStub);
            });

            it('Should create the static RSS xml file', function () {
                expect(fs.existsSync(rootPath + '/build/rss.xml')).to.be.true;
            });

            it('Should have the correct RSS content', function () {
                expect(fs.readFileSync(rootPath + '/build/rss.xml', 'utf8')).to.match(/Test post 2/);
            });
        });

        describe('When compiling the RSS feed excluding draft posts', function () {
            before(function (done) {
                fs.writeFileSync(rootPath + '/build/content/posts/test-post1.json', '{"slug":"test-post1","title":"Test post 1","template":"post.hbs","date":"2015-01-10","body":"<p>Test post content</p>"}', {encoding: 'utf8'});
                fs.writeFileSync(rootPath + '/build/content/posts/test-post2.json', '{"slug":"test-post2","title":"Test post 2","template":"post.hbs","date":"2015-01-20","body":"<p>Test post content</p>"}', {encoding: 'utf8'});
                fs.writeFileSync(rootPath + '/build/content/posts/test-post3.json', '{"slug":"test-post3","title":"Test post 3","template":"post.hbs","date":"2015-01-30","status":"draft","body":"<p>Test post content</p>"}', {encoding: 'utf8'});
                compileRss.run(rootPath, done, errorStub);
            });

            it('Should have the correct RSS content', function () {
                expect(fs.readFileSync(rootPath + '/build/rss.xml', 'utf8')).to.not.match(/Test post 3/);
            });
        });

        describe('When there are no posts for the RSS feed', function() {
            beforeEach(function(done) {
                removeDir(rootPath);
                fs.mkdirSync(rootPath);
                fs.writeFileSync(rootPath + '/site.json', '{"title":"Test site"}', {encoding: 'utf8'});
                compileRss.run(rootPath, function() {
                    doneStub();
                    done();
                }, function() {
                    errorStub();
                    done();
                });
            });

            it('Should call done', function() {
                expect(doneStub.called).to.be.true;
            });
        });

        describe('When a fs writeFile error occurs', function() {
            var fsStub, globStub, newCompileRss;

            before(function(done) {
                removeDir(rootPath);
                fs.mkdirSync(rootPath);
                fs.writeFileSync(rootPath + '/site.json', '{"title":"Test site"}', {encoding: 'utf8'});

                mockery.enable({
                    warnOnReplace: false,
                    warnOnUnregistered: false,
                    useCleanCache: true
                });

                globStub = function(paths, options, callback) {
                    callback(null, ['./file1', './file2', '/file3']);
                };

                fsStub = {
                    readdir: function(path, callback) {
                        callback(null, ['./file1', './file2', '/file3']);
                    },
                    readFileSync: function(file, encoding) {
                        return '{"slug":"test-post1","title":"Test post 1","template":"post.hbs","date":"2015-01-10","body":"<p>Test post content</p>"}';
                    },
                    writeFile: function (path, content, options, callback) {
                        callback({
                            message: 'I threw an error'
                        }, null);
                    }
                };

                mockery.registerMock('fs', fsStub);
                mockery.registerMock('glob', globStub);

                newCompileRss = require('../lib/compile-rss');

                newCompileRss.run(rootPath, function() {
                    done();
                }, function(err) {
                    errorStub(err);
                    done();
                });
            });

            it('Should throw the writeFile error', function() {
                expect(errorStub.called).to.be.true;
            });

            it('Should throw a specific error', function() {
                expect(errorStub.calledWith({ message: 'I threw an error' })).to.be.true;
            });

            after(function() {
                mockery.disable();
            });
        });

        describe('When a glob error occurs', function() {
            var globStub, newCompileRss;

            before(function(done) {
                removeDir(rootPath);
                fs.mkdirSync(rootPath);
                fs.writeFileSync(rootPath + '/site.json', '{"title":"Test site"}', {encoding: 'utf8'});

                mockery.enable({
                    warnOnReplace: false,
                    warnOnUnregistered: false,
                    useCleanCache: true
                });

                globStub = function(paths, options, callback) {
                    callback({
                        message: 'I threw an error'
                    }, null);
                };

                mockery.registerMock('glob', globStub);

                newCompileRss = require('../lib/compile-rss');

                newCompileRss.run(rootPath, function() {
                    done();
                }, function(err) {
                    errorStub(err);
                    done();
                });
            });

            it('Should throw a glob error', function() {
                expect(errorStub.called).to.be.true;
            });

            it('Should throw a specific error', function() {
                expect(errorStub.calledWith({ message: 'I threw an error' })).to.be.true;
            });

            after(function() {
                mockery.disable();
            });
        });

        after(function () {
            removeDir(rootPath);
        });
    });
})();
