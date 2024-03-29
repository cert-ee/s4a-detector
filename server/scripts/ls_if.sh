#!/usr/bin/env bash

# CONNECTIVITY INFORMATION
#
# used by installer and network_interfaces module
#

for x in $( ip link show | sed -nr 's/.*\s([a-z0-9].*):.*\s((DOWN|UP)).*/\1-\2/p' ) ; do
        if=$( echo $x | sed -nr 's/(.*)\-.*/\1/p')
        state=$( echo $x | sed -nr 's/(.*)\-(.*)/\2/p')
	ip=$( ip -4 address show dev $if | grep inet | awk '{print $2}' | cut -d'/' -f1 )

        echo "{ \"name\": \"$if\" , \"state\": \"$state\", \"ip\": \"$ip\" }"
done
