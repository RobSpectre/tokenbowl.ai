#!/bin/bash

# Remove all responsive modifiers from Pug class notation
find src -name "*.vue" -type f -exec sed -i \
  -e 's/\.sm:[a-zA-Z0-9_-]*//g' \
  -e 's/\.md:[a-zA-Z0-9_-]*//g' \
  -e 's/\.lg:[a-zA-Z0-9_-]*//g' \
  -e 's/\.xl:[a-zA-Z0-9_-]*//g' \
  -e 's/\.2xl:[a-zA-Z0-9_-]*//g' \
  {} \;

echo "Cleaned up responsive classes"