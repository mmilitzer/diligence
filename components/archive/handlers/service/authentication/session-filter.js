//
// This file is part of Diligence
//
// Copyright 2011-2015 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/diligence/service/authentication/')
document.executeOnce('/prudence/resources/')

function handleBefore(conversation) {
	if (Prudence.Resources.hasRelativePrefix(conversation, application.globals.get('diligence.service.authentication.excludeFromFilter'))) {
		return 'continue'
	}

	Diligence.Authentication.getCurrentSession(conversation)
	
	return 'continue'
}
