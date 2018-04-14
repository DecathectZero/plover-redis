var redis_url = "127.0.0.1";
var redis_port = 6379;
var redis_password = "";
if(process.env.REDIS_URL){
	var url = require('url');
	let redisURL = url.parse(process.env.REDIS_URL);
	// console.log(redisURL);
	redis_url = redisURL.hostname;
	redis_port = redisURL.port;
	console.log(process.env.REDIS_URL);
	redis_password = process.env.REDIS_PASS;
	console.log("Redis IP: " + redis_url);
	console.log("Redis Port: " + redis_port);
}

var redis = require('redis');

var RedisNotifier = require('redis-notifier');

var eventNotifier = new RedisNotifier(redis, {
  redis : { host : redis_url, port : redis_port, options: {password: redis_password}},
  expired : true,
  evicted : true
});
	
if(process.env.REDIS_URL){
	var client = redis.createClient({
		host: redis_url,
		port: redis_port,
		password: redis_password
	});
}else{
	var client = redis.createClient();
}

client.flushall( function (err, succeeded) {
	if(err){
		console.log("Redis database flush failed");
	}
    console.log("Database flush: " + succeeded); // will be true if successfull
});

const axios = require('axios');
const aws = require('aws-sdk');

/* UNCOMMENT FOR AMAZON S3 IMPLEMENTATION */

// const bucket = "plover-us-east";
// const s3 = new aws.S3();

/* UNCOMMENT FOR DIGITAL OCEAN SPACES IMPLEMENTATION */

const spaces = "https://plover.nyc3.digitaloceanspaces.com";
const bucket = "plover";
const spacesEndpoint = new aws.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new aws.S3({
	endpoint: spacesEndpoint
});

function deleteFile(hash){
	//delete file from memory and links to it
	s3.getSignedUrl('deleteObject', {
	    Bucket: bucket,
	    Key: hash,
	    Expires: 10
	}, function (err, url) {
		// console.log(url);
	  	axios.delete(url).then(function (response) {
	  		// console.log(response.headers);
	    	if(response.status == 204){
	    		console.log("deleted file: " + hash);
	    	}else{
	    		console.log(response.headers)
	    	}
 		});
	});
}

eventNotifier.on('message', function(pattern, channelPattern, emittedKey) {
  	var channel = this.parseMessageChannel(channelPattern);
  	// console.log("key event: " + emittedKey);
  	if(emittedKey.substr(0,5) === "hash:"){
  		switch(channel.key) {
	    	case 'expired':
	   			// console.log("expired");
	        	deleteFile(emittedKey.substr(5));
	      		break;
	    	case "evicted":
	      		deleteFile(emittedKey.substr(5));
	      		break;
	    	default:
	      		logger.debug("Unrecognized Channel Type:" + channel.type);
	  }
  }
});