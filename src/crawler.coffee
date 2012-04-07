fs = require "fs"
path = require "path"
_ = require "underscore"

class FSCrawler

	constructor: ( @scheduler ) ->
		_.bindAll( this )

	crawl: ( directory, onComplete ) ->
		self = this
		fileList = []
		forAll = @scheduler.parallel
		if directory and directory != ""
			directory = path.resolve directory
			fs.readdir directory, ( err, contents ) ->
				if not err and contents.length > 0
					qualified = []
					for item in contents
						qualified.push path.resolve directory, item
					
					self.classifyHandles qualified, ( files, directories ) ->
						fileList = fileList.concat files
						if directories.length > 0
							forAll directories, self.crawl, ( files ) ->
								fileList = fileList.concat _.flatten files
								onComplete fileList
						else
							onComplete fileList
				else
					onComplete fileList
		else
			onComplete fileList

	classifyHandles: ( list, onComplete ) ->
		if list and list.length > 0
			@scheduler.parallel list, @classifyHandle, ( classified ) ->
				files = []
				directories = []
				for item in classified
					if item.isDirectory then directories.push item.file else files.push item.file
				onComplete files, directories
		else
			onComplete [], []


	classifyHandle: ( file, onComplete ) ->
		fs.stat file, ( err, stat ) ->
			if err
				onComplete { file: file, err: err }
			else
				onComplete { file: file, isDirectory: stat.isDirectory() }

exports.crawler = FSCrawler