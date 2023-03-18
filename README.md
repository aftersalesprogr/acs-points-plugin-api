# ACS Points Plugin

This is a skeleton in order to integrate ACS Points in your checkout.

Please contact us for further instructions or guidance.

## Configuration

#### 1. Google Maps Api Key

In order map to work you will need to replace GOOGLEAPIKEY (index.html:46) with a Google maps api key, 
with permissions for Geocoding API & Maps JavaScript API.

Instructions can be found [here](https://developers.google.com/maps/documentation/maps-static/get-api-key).

#### 2. Cronjob for updating ACS Points
All available ACS Points are stored in a json file that needs to being updated every hour.
A sample file is included in the repository but is provided for development and testing purposes only. 

You can fetch a fresh file by running update-points.php, also we suggest to set a hourly cron job in this file.

Please note that this file needs API credentials that are provided by ACS Courier. 
Please fill the credentials in file update-points.php:2-8.
