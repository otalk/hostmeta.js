"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            options: {
                standalone: 'getHostMeta'
            },
            dist: {
                files: {
                    'build/hostmeta.bundle.js': ['<%= pkg.main %>']
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! hostmeta <%= grunt.template.today("yyyy-mm-dd") %>'
            },
            dist: {
                files: {
                    'build/hostmeta.bundle.min.js': ['build/hostmeta.bundle.js']
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'index.js', 'lib/**.js', 'test/**.js'],
            options: grunt.file.readJSON('.jshintrc')
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint', 'browserify', 'uglify']);
};
