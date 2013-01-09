//
// This file is part of Diligence
//
// Copyright 2011-2013 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/diligence/service/authentication/')

/** @ignore */
function handleInit(conversation) {
}

/** @ignore */
function handleGet(conversation) {
	var session = Diligence.Authentication.getCurrentSession(conversation)
	if (session) {
		session.logout()
	}

	conversation.response.redirectSeeOther(conversation.reference.baseRef)
	
	return null
}
