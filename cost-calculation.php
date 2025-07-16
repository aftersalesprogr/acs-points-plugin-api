<?php

function calculate_shipping_cost(
    $orderTotalCost,
    $weightTotal
)
{
    $settings = [
        'dispatcherCountry' => 'GR',
        'dispatcherZipcode' => '',
        'freeShippingUpperLimit' => '',
        'acsClientId' => '',
        'pricing' => [
            'same_city' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
            'island' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
            'region' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
            'overland' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
            'internal_cyprus' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
            'cyprus' => [
                'baseCost' => '',
                'baseCostKgLimit' => '',
                'costPerKg' => '',
            ],
        ]
    ];

    $sender_country = $settings['dispatcherCountry'] ?? 'GR';
    $sender_zipcode = $settings['dispatcherZipcode'] ?? null;
    $sender_billing_code = $settings['acsClientId'] ?? null;

    $recipient_zipcode = $package['destination']['postcode'] ?? null;
    $recipient_country = $package['destination']['country'] ?? 'GR';

    $costGroup = calculate_type($sender_country, $sender_zipcode, $sender_billing_code, $recipient_country, $recipient_zipcode);

    $baseCost = $settings['pricing'][$costGroup]['baseCost'] ?? 0;
    $baseCostKgLimit = $settings['pricing'][$costGroup]['baseCostKgLimit'] ?? 0;
    $costPerKg = $settings['pricing'][$costGroup]['costPerKg'] ?? 0;

    $freeShippingLimit = $settings['freeShippingUpperLimit'];
    $optionCost = 0;

    $weightTotal = ceil($weightTotal);
    if ($freeShippingLimit != '' && $orderTotalCost < $freeShippingLimit) {
        $optionCost = $baseCost;
        if ($weightTotal > $baseCostKgLimit) {
            $optionCost += $costPerKg * ($weightTotal - $baseCostKgLimit);
        }
    }

    return $optionCost;
}

function calculate_type(
    $sender_country,
    $sender_zipcode,
    $sender_billing_code,
    $recipient_country,
    $recipient_zipcode
)
{
    preg_match('/\d([^\d]{2})\d+/u', $sender_billing_code, $matches);
    $sender_store = $matches[1] ?? null;
    $sender_zipcode_data = getDataFromZipcode($sender_zipcode);
    $recipient_zipcode_data = getDataFromZipcode($recipient_zipcode);

    if (!in_array($recipient_country, ['GR', 'CY']) && !in_array($sender_country, ['GR', 'CY'])) {
        return false;
    }

    if ($sender_country === 'CY' && $recipient_country === 'CY') {
        return 'internal_cyprus';
    }

    if ($sender_country === 'CY' || $recipient_country === 'CY') {
        return 'cyprus';
    }

    if ($sender_store == $recipient_zipcode_data['store']) {
        return 'same_city';
    }

    if ($recipient_zipcode_data['category'] == 'ΝΗΣΙΩΤΙΚΟΣ') {
        return 'island';
    }

    if (
        $recipient_zipcode_data['region'] != ''
        && $sender_zipcode_data['region'] != ''
        && $recipient_zipcode_data['region'] == $sender_zipcode_data['region']
    ) {
        return 'region';
    }

    return 'overland';
}

function getDataFromZipcode($recipient_zipcode)
{
    $json = file_get_contents(__DIR__ . '/mapper.json');
    $data = json_decode($json, true);

    return [
        'store' => $data[$recipient_zipcode]['store'] ?? null,
        'category' => $data[$recipient_zipcode]['category'] ?? null,
        'region' => $data[$recipient_zipcode]['region'] ?? null,
    ];
}
