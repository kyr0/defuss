#!/bin/bash

# Clean any previous builds
rm -rf dist/ build/ *.egg-info/

# Build the package
python -m build

# Upload to Test PyPI first
twine upload dist/*