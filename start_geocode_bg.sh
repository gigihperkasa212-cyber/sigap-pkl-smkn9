#!/bin/bash
nohup bash /tmp/run_batch_geocode.sh > /tmp/batch_geocode_log.txt 2>&1 &
echo "Batch geocode started, PID: $!"
echo "Monitor: tail -f /tmp/batch_geocode_log.txt"
