#!/bin/bash

# This script will grep all the *.yml files for YAML anchors
# if an anchor appears multiple times inside a file, this validation script will fail
# Duplicate anchors in a file are valid syntax, however the generated output could be not what we intended

set -e

if [[ ! -d './apis' ]]; then
    echo "Error: Cannot find ./apis directory. please run script from root directory" 1>&2;
    exit 1
fi

echo "Checking for duplicate YAML anchors inside files..."

output=$(grep -E -o -r --include='*.yml' ':\s?&\w+' ./apis |sort| uniq -c |sort -r | awk 'int($1)>1')

if [ -z "$output" ]
then
  echo "No duplicate anchors found"
  exit
else
  echo "Error, found duplicate anchors.  Please rename or delete the duplicates." 1>&2;
  echo "$output" 1>&2;
  exit 1
fi
