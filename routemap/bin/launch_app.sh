#!/bin/bash  

$SPLUNK_HOME/bin/splunk cmd node $(dirname $0)/app/app.js
