#!/usr/bin/php
<?php
    if (sizeof($argv) != 2) {
        echo "usage: $argv[0] <encrypted_value>\n";
        return -1;
    }

    coapi_login("admin");
    $query_result = coapi_query("master_key");
    $row = coapi_fetch($query_result);
    $master_key = $row["master_key"];
    $plain = f5_decrypt_string($argv[1], $master_key);
    echo $plain;
    return 0;
?>
