#!/usr/bin/env bash

row="$1"
bucketName=$(cut -d , -f 2 <<< "$row")
response=$(gsutil -u anvil-and-terra-development du -s gs://"$bucketName")
size=$(cut -d ' ' -f 1 <<< "$response")
echo $row,"$size"
