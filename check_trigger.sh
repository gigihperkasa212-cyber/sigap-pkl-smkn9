#!/bin/bash
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SHOW TRIGGERS" 2>&1 | grep -i alpa
echo "---"
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SHOW TRIGGERS" 2>&1 | head -3
