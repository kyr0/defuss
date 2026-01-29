## TODO

- It's annoying that we're getting duplicate constraint issues with upsert (!)
- It's very annoying that an empty "pk" is possible and Mongo accepts it leading to empty records that cannot be handled by the app
- It's even more annoying that we don't have an auto index on all tables and to make it the perfect storm, we have no way of nested referencing/indexing
- The argument order is crap right now. Sometimes index comes last, sometimes first.