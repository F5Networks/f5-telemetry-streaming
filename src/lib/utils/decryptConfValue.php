#!/usr/bin/php
<?php
    if (sizeof($argv) == 1) {
        echo "usage: $argv[0] <encrypted_value1> [<encrypted_value2> <encrypted_value3>...]\n";
        return -1;
    }

    coapi_login("admin");
    $query_result = coapi_query("master_key");
    $row = coapi_fetch($query_result);
    $master_key = $row["master_key"];

    foreach(array_slice($argv, 1) as $arg) {
        $plain = f5_decrypt_string($arg, $master_key);
        echo $plain;
    }
    return 0;
?>
