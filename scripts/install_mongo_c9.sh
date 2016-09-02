#!/usr/bin/env bash

#############################################################
#               Setting up MondoDB on Cloud9                #
#                                                           #
# See: https://community.c9.io/t/setting-up-mongodb/1717    #
#############################################################

echo "/*** Install MongoDB ***/"

sudo apt-get install -y mongodb-org


echo "/*** Create data folder ***/"
mkdir mongodb_data


echo "/*** Prepare 'mongod' command ***/"
echo 'mongod --bind_ip=$IP --dbpath=mongodb_data --nojournal --rest "$@"' > mongod
chmod a+x mongod
