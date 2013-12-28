//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/prudence/tasks/')

Diligence.Tasks.task({
	fn: function() {
		document.executeOnce('/diligence/service/notification/')
		Diligence.Notification.sendQueuedNotices()
	},
	repeatEvery: 10000
})

Diligence.Tasks.task({
	name: '/hello/',
	sayHello: 'Tal',
	distributed: true,
	block: 2000
})

application.distributedGlobals.put('test', 'I\'m a distributed value')
application.logger.info(application.distributedGlobals.get('test'))
