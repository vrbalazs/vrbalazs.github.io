<?php

define('MYSQL_HOST', 'localhost');
define('MYSQL_DB', 'ww_monuments');
define('MYSQL_USER', 'ww_monuments');
define('MYSQL_PASSWD', 'f3424fDh3d89qD%3');

header("Access-Control-Allow-Origin: *");

$conn = new mysqli(MYSQL_HOST, MYSQL_USER, MYSQL_PASSWD, MYSQL_DB);
if ($conn->connect_error) {
	header("HTTP/1.1 500 Internal Server Error");
	die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset('utf8');

$query = str_replace('**','%', urldecode($_GET['query']));
$result = $conn->query($query);
if (!$result) {
	header("HTTP/1.1 400 Bad Request");
	die("Errormessage: " . $conn->error);
}

$rows = [];
while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}
echo json_encode($rows);

$conn->close();
