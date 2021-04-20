#!/usr/bin/env bash

row="$1"
workspaceName=$(cut -d , -f 1 <<< "$row")
bucketName=$(cut -d , -f 2 <<< "$row")
response=$(gsutil -u anvil-and-terra-development requesterpays get  gs://"$bucketName")
rp=$(cut -d ' ' -f 2 <<< "$response")
echo $workspaceName,$bucketName,"$rp"
