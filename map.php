<?php
function download_file($uri) {
	$context = stream_context_create(["http" => [
		"method" => "GET",
		"header" => "user-agent: WW1-monuments Tile proxy 1.0 contact frncszb@gmail.com\r\n",
	]]);
	return file_get_contents($uri, false, $context);
}

$sources = [
	'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
	'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
	'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

$coords = explode(',', $_GET['tile']);
$x = $coords[0];
$y = $coords[1];
$z = $coords[2];

$dirname = __DIR__."/../tiles/$z/$x";
$filename = "$dirname/$y.png";

header("Access-Control-Allow-Origin: *");

if (!file_exists($filename)) {
	$url = str_replace('{z}/{x}/{y}', "$z/$x/$y", $sources[array_rand($sources)]);
	$png = download_file($url);
	if ($png) {
		if (!file_exists($dirname)) mkdir($dirname, 0777, true);
		file_put_contents($filename, $png);
	} else {
		die('Error downloading file: '.$url);
	}
}

if (file_exists($filename)) {
	header("Content-Type: image/png");
    readfile($filename);
}
