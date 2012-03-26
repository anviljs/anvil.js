class Scheduler

	constructor: () ->

	parallel: ( items, worker, onComplete ) ->
		# Fail fast if list is empty
		if not items or items == []
			onComplete []
		count = items.length
		results = []
		# Pushes _result_ (if truthy) onto the _results_ list and, if there are no more
		# items, calls _onComplete_ with _results_
		done = ( result ) ->
			count = count - 1
			# Is _result_ truthy?
			if result
				# Append to _results_!
				results.push result
			# Is iteration complete?
			if count == 0
				# Call _onComplete_!
				onComplete( results )
		# Iteration occurs here
		worker( item, done ) for item in items


	pipeline: ( item, workers, onComplete ) ->
		# Fail fast if list is empty
		if item == undefined or not workers or workers.length == 0
			onComplete {}

		count = workers.length
		result = item
		done = ( product ) ->
			count = count - 1
			result = product
			# Is iteration complete?
			if count == 0
				# Call _onComplete_!
				onComplete( result )
		# Iteration occurs here
		( worker result, done ) for worker in workers

exports.scheduler = new Scheduler()
