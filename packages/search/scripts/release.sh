#!/bin/bash
# npm ignores all files in .gitignore but they have to
# end up in the package release despite not being tracked in git.

mv pkg/.gitignore pkg/_gitignore 
npm pack
mv pkg/_gitignore pkg/.gitignore