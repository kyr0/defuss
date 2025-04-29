# Auth

User authentication, when done right, is based on cryptography.
There are many ways how to do "login" and "logout" right,
but the most simple and straight-forward way remains to be
the username/password scheme. Here, the username is exchangable 
for an email address and the password could be an API key as well.

However, we don't want to carry the username and password around
with each request. Instead, it would be handy to authenticate the
user once, based on their username/password combination, resolve
their roles/permissions and hand same a cryptographically signed
token that contains all this information, and that can be trusted,
validated and revoked, when necessary.

JWT is the common web standard for this mechanism, however most 
developers rely on 3rd party systems to create tokens for them.
This isn't really necessary for most application use-cases, 
as the whole process only involves one private key 
(that is generated for a deployment and kept secret; e.g. via an 
encrypted environment variable) and a few functions to:

1) derive JWT tokens based on that private key
2) verify JWT tokens that were derived from that private key
3) store specfic JWT tokens as revoked (lookup for revoked tokens happens in the verify process)

This is the API that `defuss-auth` implements. 

It allows for implementing arbitrary User Access Control systems based on the JWT
authentication scheme without requring any 3rd party service.

## What about key rotation?

In the rare case that the private key is exposed, key rotation would be
necessary. For that, a new key-pair is created as we don't want any derived JWT to work anymore. 
Every user would have to re-login using their secure password.

## What about refresh tokens?

Refresh tokens allow "silent reissue" of access tokens without repeatedly collecting credentials, 
but they add complexity and risk (since a stolen refresh token can be used for a long time, especially
when the revoke mechanism is not implemented/used properly). `defuss-auth` assumes that your 
application can handle user re-logins using username/password and solely relies on short-lived access tokens.
However, you can decide what "short-lived" means by setting the `exp` time accordingly.