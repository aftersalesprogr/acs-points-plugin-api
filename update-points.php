<?php
$settings = [
    'acsCompanyID' => '',
    'acsCompanyPassword' => '',
    'acsUserID' => '',
    'acsUserPassword' => '',
    'acsApiKey' => '',
    'countries_availability' => '', //all, cy, gr
];
$content = [
    'ACSAlias' => 'ACS_Get_Stations_For_Plugin',
    'ACSInputParameters' => [
        'locale' => null,
        'Company_ID' => $settings['acsCompanyID'],
        'Company_Password' => $settings['acsCompanyPassword'],
        'User_ID' => $settings['acsUserID'],
        'User_Password' => $settings['acsUserPassword'],
    ],
];

$url = "https://webservices.acscourier.net/ACSRestServices/api/ACSAutoRest";
$curl = curl_init($url);
curl_setopt($curl, CURLOPT_HEADER, false);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_HTTPHEADER,
    array(
        'Accept: application/json',
        'Content-Type: application/json',
        'ACSApiKey: ' . $settings['acsApiKey'],
    )
);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($content));
$json_response = curl_exec($curl);
curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$response = json_decode($json_response, true);

$points = $response['ACSOutputResponce']['ACSTableOutput']['Table_Data1'] ?? [];

$points = array_values(array_filter($points, function ($item) use ($settings) {

    if ($item['type'] == 'branch' && $item['Acs_Station_Branch_Destination'] != '1') {
        return false;
    }

    if (
        isset($settings['countries_availability'])
        && $settings['countries_availability'] == 'cy'
        && $item['Country_Code'] != 'CY'
    ) {
        return false;
    }

    if (
        isset($settings['countries_availability'])
        && $settings['countries_availability'] == 'gr'
        && $item['Country_Code'] != 'GR'
    ) {
        return false;
    }

    return true;
}));

$data = [
    'code' => curl_getinfo($curl, CURLINFO_HTTP_CODE),
    'meta' => $response['ACSOutputResponce']['ACSTableOutput']['Table_Data'] ?? [],
    'points' => $points ?? [],
];

file_put_contents(
    __DIR__ . '/data.json',
    json_encode([
        'timestamp' => date('Y-m-d H:i'),
        'meta' => $response['ACSOutputResponce']['ACSTableOutput']['Table_Data'] ?? [],
        'points' => $points ?? [],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);
